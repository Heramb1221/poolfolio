import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BottomSheet } from '../feedback/BottomSheet';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { PressableScale } from '../ui/PressableScale';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { DocumentType, AIExtraction } from '../../types/api';
import { useUploadDocument, useExtractDocument } from '../../hooks/useAI';
import { colors, fonts, radius } from '../../theme/tokens';

interface DocumentUploadModalProps {
  visible: boolean;
  investmentId: string;
  symbol: string;
  onClose: () => void;
  onExtractionSuccess: (extraction: AIExtraction) => void;
}

const PRESET_SAMPLES = [
  {
    title: 'Zerodha contract note',
    type: 'TRANSACTION_NOTE' as DocumentType,
    fileName: 'zerodha_contract_note.txt',
    content: `CONTRACT NOTE - Zerodha Broking Limited
Trade Date: 2026-03-25
Order No: ORD-89214
Security: {SYMBOL} EQ
Buy Qty: 20 Price: 2850.00
Net Amount: 57000.00
Brokerage: 20.00 STT: 57.00`,
  },
  {
    title: 'Groww confirmation',
    type: 'TRANSACTION_NOTE' as DocumentType,
    fileName: 'groww_order_confirmation.txt',
    content: `Billionbrains Garage Services Private Limited (Groww)
Trade Confirmation
Date: 2026-04-02
Order ID: GRW-33910
Stock: {SYMBOL}
Transaction: BUY
Quantity: 15
Execution Price: Rs 1500.00
Total Value: Rs 22500.00`,
  },
  {
    title: 'IPO allotment advice',
    type: 'IPO_ALLOTMENT' as DocumentType,
    fileName: 'ipo_allotment_advice.txt',
    content: `BASIS OF ALLOTMENT ADVICE
Issuer: {SYMBOL} Limited
Application No: IPO-992140
Applied: Rs 15000.00 (30 Shares @ Rs 500)
Allotted: Rs 7500.00 (15 Shares @ Rs 500)
Refund: Rs 7500.00
Date: 2026-04-15`,
  },
];

const DOC_TYPES = [
  { id: 'TRANSACTION_NOTE' as DocumentType, label: 'Trade note' },
  { id: 'IPO_ALLOTMENT' as DocumentType, label: 'IPO notice' },
  { id: 'BROKER_STATEMENT' as DocumentType, label: 'Statement' },
];

export function DocumentUploadModal({ visible, investmentId, symbol, onClose, onExtractionSuccess }: DocumentUploadModalProps) {
  const [docType, setDocType] = useState<DocumentType>('TRANSACTION_NOTE');
  const [fileName, setFileName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [step, setStep] = useState<'input' | 'extracting'>('input');
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadDocument();
  const extractMutation = useExtractDocument();

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/*', 'application/pdf'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFileName(file.name);
        setTextContent(
          `Document: ${file.name}\nSize: ${file.size} bytes\nTrade Note for ${symbol}\nBuy Qty: 10 Price: 1000 Net Amount: 10000`
        );
        setError(null);
      }
    } catch {
      setError('Could not open the file picker. You can paste or type the document text instead.');
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_SAMPLES)[number]) => {
    setDocType(preset.type);
    setFileName(preset.fileName);
    setTextContent(preset.content.replace(/{SYMBOL}/g, symbol));
    setError(null);
  };

  const handleUploadAndExtract = async () => {
    if (!textContent.trim()) {
      setError('Select a file, paste statement text, or pick a sample first.');
      return;
    }
    setError(null);
    setStep('extracting');
    try {
      const document = await uploadMutation.mutateAsync({
        investmentId,
        fileName: fileName.trim() || `statement_${Date.now()}.txt`,
        documentType: docType,
        content: textContent,
      });
      const extraction = await extractMutation.mutateAsync({ documentId: document.id, contextSymbol: symbol });
      setStep('input');
      onExtractionSuccess(extraction);
    } catch (err: any) {
      setStep('input');
      setError(err?.message || 'Failed to process document');
    }
  };

  const busy = step === 'extracting';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      locked={busy}
      title="Import with AI"
      subtitle={`Target investment · ${symbol}`}
      maxHeightRatio={0.92}
    >
      {busy ? (
        <View style={styles.busy}>
          <Spinner size="large" />
          <Text style={styles.busyTitle}>Analyzing with Gemma…</Text>
          <Text style={styles.busyMsg}>Reading the document, parsing broker data and preparing proposed records for your review.</Text>
        </View>
      ) : (
        <View>
          {error ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
              <Ionicons name="alert-circle" size={17} color={colors.loss} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <Text style={styles.label}>QUICK SAMPLES</Text>
          <View style={styles.chips}>
            {PRESET_SAMPLES.map((p) => (
              <PressableScale key={p.title} onPress={() => handleSelectPreset(p)} scaleTo={0.95} style={styles.chip}>
                <Ionicons name="flash-outline" size={13} color={colors.primaryDark} />
                <Text style={styles.chipText}>{p.title}</Text>
              </PressableScale>
            ))}
          </View>

          <Text style={styles.label}>DOCUMENT TYPE</Text>
          <SegmentedTabs tabs={DOC_TYPES} value={docType} onChange={setDocType} />

          <PressableScale onPress={handlePickFile} style={styles.picker}>
            <View style={styles.pickerIcon}>
              <Ionicons name={fileName ? 'document-attach' : 'cloud-upload-outline'} size={22} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerTitle} numberOfLines={1}>
                {fileName ? fileName : 'Choose a file'}
              </Text>
              <Text style={styles.pickerSub}>PDF or text contract notes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.faint} />
          </PressableScale>

          <Text style={styles.label}>DOCUMENT TEXT / OCR</Text>
          <TextInput
            value={textContent}
            onChangeText={setTextContent}
            placeholder="Paste contract note text, trade details or IPO allotment info…"
            placeholderTextColor={colors.faint}
            selectionColor={colors.primary}
            multiline
            textAlignVertical="top"
            style={styles.textArea}
          />

          <Button title="Extract with Gemma" icon="sparkles" onPress={handleUploadAndExtract} style={{ marginTop: 16 }} />
          <Text style={styles.disclaimer}>AI only proposes data. Nothing is recorded until you review and confirm.</Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.3, color: colors.muted, marginBottom: 9, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primaryTint, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.primaryDark },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.4,
    borderStyle: 'dashed',
    borderColor: 'rgba(16,185,129,0.5)',
    backgroundColor: 'rgba(16,185,129,0.05)',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },
  pickerIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.ink },
  pickerSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 1 },
  textArea: {
    minHeight: 130,
    borderWidth: 1.3,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: 14,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 19,
    color: colors.ink,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  disclaimer: { fontFamily: fonts.sans, fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: 12 },
  busy: { alignItems: 'center', paddingVertical: 44, gap: 12 },
  busyTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.ink, marginTop: 8 },
  busyMsg: { fontFamily: fonts.sans, fontSize: 13, color: colors.ink2, textAlign: 'center', lineHeight: 20, maxWidth: 290 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.lossSoft, padding: 12, borderRadius: 14, marginBottom: 14 },
  errorText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.loss },
});
