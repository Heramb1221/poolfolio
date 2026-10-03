import fs from 'fs/promises';
import path from 'path';
import { DocumentStatus, DocumentType, ExtractionStatus, GroupRole, InvestmentStatus, Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { TransactionService } from '../../services/transaction.service';
import { gemmaClient } from './gemma.client';
import { aiExtractionOutputSchema, ConfirmExtractionInput, ExtractDocumentInput, UploadDocumentInput } from './schemas';
import { AIExtractionOutput } from './types';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents');

export class AIService {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * Helper to ensure the upload directory exists.
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch {
      // Ignore if exists
    }
  }

  /**
   * 1. Upload a document (broker note, contract note, IPO notice)
   */
  public async uploadDocument(userId: string, input: UploadDocumentInput) {
    await this.ensureUploadDir();

    // Verify investment exists and caller is a member, if investmentId is specified
    if (input.investmentId) {
      const investment = await prisma.investment.findUnique({
        where: { id: input.investmentId },
        include: {
          group: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!investment) {
        throw new NotFoundError('Investment not found');
      }

      if (investment.group.members.length === 0) {
        throw new ForbiddenError('You do not belong to the group associated with this investment');
      }
    }

    const docId = crypto.randomUUID();
    const filePath = path.join(UPLOAD_DIR, `${docId}.txt`);
    await fs.writeFile(filePath, input.content, 'utf-8');

    const document = await prisma.document.create({
      data: {
        id: docId,
        investmentId: input.investmentId || null,
        uploadedById: userId,
        fileName: input.fileName,
        fileUrl: input.fileUrl || `/uploads/documents/${docId}.txt`,
        documentType: input.documentType || DocumentType.OTHER,
        status: DocumentStatus.UPLOADED,
      },
      include: {
        investment: {
          select: { id: true, name: true, symbol: true, type: true, status: true },
        },
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return document;
  }

  /**
   * 2. Run the Gemma extraction pipeline on an uploaded document
   */
  public async extractDocument(documentId: string, userId: string, options?: ExtractDocumentInput) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        investment: {
          include: {
            group: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Authorization: User must be the uploader OR a member of the investment's group
    if (document.investment) {
      if (document.investment.group.members.length === 0 && document.uploadedById !== userId) {
        throw new ForbiddenError('You do not have access to this document');
      }
    } else if (document.uploadedById !== userId) {
      throw new ForbiddenError('You do not have access to this document');
    }

    // Read stored document text
    const filePath = path.join(UPLOAD_DIR, `${document.id}.txt`);
    let rawContent = '';
    try {
      rawContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      rawContent = `Document: ${document.fileName}\nDate: ${document.createdAt.toISOString()}`;
    }

    // Mark document as PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.PROCESSING },
    });

    try {
      const contextSymbol = options?.contextSymbol || document.investment?.symbol;
      const extractionResult: AIExtractionOutput = await gemmaClient.extract(rawContent, {
        documentType: document.documentType,
        contextSymbol,
      });

      // Validate schema
      const validated = aiExtractionOutputSchema.parse(extractionResult);

      // Save AIExtraction record in PENDING_REVIEW status
      const extraction = await prisma.aIExtraction.create({
        data: {
          documentId,
          model: 'gemma-2-2b-it',
          extractedData: validated as unknown as Prisma.InputJsonValue,
          confidence: new Prisma.Decimal(validated.overallConfidence),
          status: ExtractionStatus.PENDING_REVIEW,
        },
        include: {
          document: {
            include: {
              investment: true,
            },
          },
        },
      });

      // Update document to PROCESSED
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSED },
      });

      return extraction;
    } catch (error) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED },
      });
      throw error;
    }
  }

  /**
   * 3. Get document details with extractions
   */
  public async getDocumentById(documentId: string, userId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        investment: {
          include: {
            group: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
        extractions: {
          orderBy: { createdAt: 'desc' },
        },
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    if (document.investment) {
      if (document.investment.group.members.length === 0 && document.uploadedById !== userId) {
        throw new ForbiddenError('You do not have access to this document');
      }
    } else if (document.uploadedById !== userId) {
      throw new ForbiddenError('You do not have access to this document');
    }

    return document;
  }

  /**
   * 4. Get a single extraction by ID
   */
  public async getExtractionById(extractionId: string, userId: string) {
    const extraction = await prisma.aIExtraction.findUnique({
      where: { id: extractionId },
      include: {
        document: {
          include: {
            investment: {
              include: {
                group: {
                  include: {
                    members: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
        confirmedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!extraction) {
      throw new NotFoundError('AI Extraction not found');
    }

    if (extraction.document.investment) {
      if (
        extraction.document.investment.group.members.length === 0 &&
        extraction.document.uploadedById !== userId
      ) {
        throw new ForbiddenError('You do not have access to this extraction');
      }
    } else if (extraction.document.uploadedById !== userId) {
      throw new ForbiddenError('You do not have access to this extraction');
    }

    return extraction;
  }

  /**
   * 5. User review & confirmation:
   * Writes the verified data into the authoritative ledger and marks extraction as CONFIRMED.
   */
  public async confirmExtraction(
    extractionId: string,
    userId: string,
    input: ConfirmExtractionInput
  ) {
    const extraction = await prisma.aIExtraction.findUnique({
      where: { id: extractionId },
      include: {
        document: {
          include: {
            investment: {
              include: {
                group: {
                  include: {
                    members: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!extraction) {
      throw new NotFoundError('AI Extraction not found');
    }

    if (extraction.status !== ExtractionStatus.PENDING_REVIEW) {
      throw new BadRequestError(
        `Cannot confirm an extraction that is already in ${extraction.status} status`
      );
    }

    const targetInvestmentId = input.investmentId || extraction.document.investmentId;
    if (!targetInvestmentId) {
      throw new BadRequestError('An investment ID is required to record the confirmed transaction');
    }

    // Verify investment exists and verify permissions
    const investment = await prisma.investment.findUnique({
      where: { id: targetInvestmentId },
      include: {
        group: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!investment) {
      throw new NotFoundError('Investment not found');
    }

    const membership = investment.group.members[0];
    if (!membership) {
      throw new ForbiddenError('You do not belong to the group for this investment');
    }

    // Only LEADER and CO_LEADER can confirm and write transactions into the group ledger
    if (membership.role === GroupRole.MEMBER) {
      throw new ForbiddenError('Only group leaders and co-leaders can record confirmed transactions');
    }

    // Write to authoritative transaction ledger via TransactionService
    const transaction = await this.transactionService.createTransaction(
      targetInvestmentId,
      userId,
      {
        type: input.type,
        amount: input.amount,
        quantity: input.quantity,
        price: input.price,
        transactionDate: input.transactionDate,
        reference: input.reference || `AI-CONFIRMED-${extraction.id.slice(0, 8)}`,
        notes: input.notes
          ? `${input.notes} (Confirmed from AI Extraction)`
          : `Confirmed from AI Extraction (Doc: ${extraction.document.fileName})`,
        userId: input.userId,
      }
    );

    // Update extraction status to CONFIRMED
    const updatedExtraction = await prisma.aIExtraction.update({
      where: { id: extractionId },
      data: {
        status: ExtractionStatus.CONFIRMED,
        confirmedById: userId,
        confirmedAt: new Date(),
      },
      include: {
        confirmedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      extraction: updatedExtraction,
      transaction,
    };
  }

  /**
   * 6. User review rejection:
   * Marks extraction as REJECTED without writing to the ledger.
   */
  public async rejectExtraction(extractionId: string, userId: string) {
    const extraction = await prisma.aIExtraction.findUnique({
      where: { id: extractionId },
    });

    if (!extraction) {
      throw new NotFoundError('AI Extraction not found');
    }

    if (extraction.status !== ExtractionStatus.PENDING_REVIEW) {
      throw new BadRequestError(
        `Cannot reject an extraction that is in ${extraction.status} status`
      );
    }

    const updated = await prisma.aIExtraction.update({
      where: { id: extractionId },
      data: {
        status: ExtractionStatus.REJECTED,
      },
    });

    return updated;
  }
}

export const aiService = new AIService();
