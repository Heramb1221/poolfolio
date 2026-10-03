import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AIExtraction, ExtractedTransactionItem, TransactionType } from '../../types/api';
import { useConfirmExtraction, useRejectExtraction } from '../../hooks/useAI';

interface ExtractionReviewModalProps {
  visible: boolean;
  investmentId: string;
  extraction: AIExtraction | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TRANSACTION_TYPES: TransactionType[] = [
  'BUY',
  'SELL',
  'ALLOTMENT',
  'REFUND',
  'DIVIDEND',
  'FEE',
  'TAX',
  'CONTRIBUTION',
];

export function ExtractionReviewModal({
  visible,
  investmentId,
  extraction,
  onClose,
  onSuccess,
}: ExtractionReviewModalProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Form states for the selected item
  const [type, setType] = useState<TransactionType>('BUY');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const confirmMutation = useConfirmExtraction(investmentId);
  const rejectMutation = useRejectExtraction();

  // Populate form whenever extraction or selected item changes
  useEffect(() => {
    if (extraction && extraction.extractedData.items.length > 0) {
      const item = extraction.extractedData.items[selectedIdx] || extraction.extractedData.items[0];
      setType(item.type);
      setAmount(item.amount);
      setQuantity(item.quantity || '');
      setPrice(item.price || '');
      setDate(item.transactionDate || new Date().toISOString().split('T')[0]);
      setReference(item.reference || '');
      setNotes(item.notes || '');
    }
  }, [extraction, selectedIdx]);

  if (!extraction) return null;

  const items = extraction.extractedData.items;
  const currentItem = items[selectedIdx] || items[0];
  const confidencePercent = extraction.confidence
    ? Math.round(Number(extraction.confidence) * 100)
    : 85;

  const handleConfirm = async () => {
    if (!amount.trim() || Number(amount) <= 0) {
      Alert.alert('Validation Error', 'Transaction amount must be a positive decimal.');
      return;
    }

    try {
      await confirmMutation.mutateAsync({
        extractionId: extraction.id,
        input: {
          investmentId,
          itemIndex: selectedIdx,
          type,
          amount: amount.trim(),
          quantity: quantity.trim() ? quantity.trim() : undefined,
          price: price.trim() ? price.trim() : undefined,
          transactionDate: date ? new Date(date).toISOString() : undefined,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });

      Alert.alert('Success', 'AI proposed transaction confirmed and recorded into the ledger!');
      onSuccess();
    } catch (err: any) {
      Alert.alert('Confirmation Error', err.message || 'Failed to record transaction');
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Extraction',
      'Are you sure you want to discard this proposed extraction without recording it?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectMutation.mutateAsync(extraction.id);
              onClose();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject extraction');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="bg-slate-900 rounded-t-3xl border-t border-slate-800 p-6 max-h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-800">
            <View>
              <Text className="text-white text-lg font-bold">Review AI Extraction</Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Model Confidence: <Text className="text-emerald-400 font-semibold">{confidencePercent}%</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <Text className="text-slate-400 font-bold text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          {/* AI Safety Rule Notice Banner */}
          <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 my-3">
            <Text className="text-amber-400 text-xs font-bold">PROPOSED DATA — PENDING REVIEW</Text>
            <Text className="text-amber-300/80 text-[11px] mt-0.5 leading-4">
              AI assists data entry; deterministic accounting remains authoritative. Review and verify numbers before confirming to the group ledger.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-1">
            {/* If multiple items were extracted, render item tab selector */}
            {items.length > 1 && (
              <View className="mb-4">
                <Text className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Extracted Items ({items.length}):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                  {items.map((it, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg border mr-2 ${
                        selectedIdx === idx
                          ? 'bg-emerald-500/20 border-emerald-500'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          selectedIdx === idx ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        Item #{idx + 1}: {it.type} (INR {it.amount})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Transaction Type Selector */}
            <Text className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Transaction Type:
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {TRANSACTION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  className={`py-1.5 px-3 rounded-lg border ${
                    type === t
                      ? 'bg-emerald-500/20 border-emerald-500'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      type === t ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Input
              label="Transaction Amount (INR)*"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="e.g. 50000.00"
            />

            {/* Quantity and Price */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 20"
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Price / Rate (INR)"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2500.00"
                />
              </View>
            </View>

            {/* Date */}
            <Input
              label="Transaction Date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder="2026-04-10"
            />

            {/* Reference */}
            <Input
              label="Reference / Order ID"
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. ORD-98124"
            />

            {/* Notes */}
            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Brief comment or details"
            />

            {/* Actions */}
            <View className="mt-4 mb-6 gap-3">
              <Button
                title="Confirm & Record to Ledger"
                onPress={handleConfirm}
                isLoading={confirmMutation.isPending}
              />
              <Button
                title="Discard Proposed Extraction"
                variant="outline"
                onPress={handleReject}
                disabled={confirmMutation.isPending || rejectMutation.isPending}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
