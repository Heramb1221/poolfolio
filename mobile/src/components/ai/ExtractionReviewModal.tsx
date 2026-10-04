import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BottomSheet } from '../feedback/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PressableScale } from '../ui/PressableScale';
import { AIExtraction, TransactionType } from '../../types/api';
import { useConfirmExtraction, useRejectExtraction } from '../../hooks/useAI';
import { colors, fonts, radius } from '../../theme/tokens';

interface ExtractionReviewModalProps {
  visible: boolean;
  investmentId: string;
  extraction: AIExtraction | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TRANSACTION_TYPES: TransactionType[] = ['BUY', 'SELL', 'ALLOTMENT', 'REFUND', 'DIVIDEND', 'FEE', 'TAX', 'CONTRIBUTION'];

export function ExtractionReviewModal({ visible, investmentId, extraction, onClose, onSuccess }: ExtractionReviewModalProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [type, setType] = useState<TransactionType>('BUY');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [discardArmed, setDiscardArmed] = useState(false);

  const confirmMutation = useConfirmExtraction(investmentId);
  const rejectMutation = useRejectExtraction();

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

  useEffect(() => {
    if (visible) {
      setError(null);
      setDiscardArmed(false);
      setSelectedIdx(0);
    }
  }, [visible]);

  if (!extraction) return null;

  const items = extraction.extractedData.items;
  const confidencePercent = extraction.confidence ? Math.round(Number(extraction.confidence) * 100) : 85;

  const handleConfirm = async () => {
    if (!amount.trim() || Number(amount) <= 0) {
      setError('Transaction amount must be a positive decimal.');
      return;
    }
    setError(null);
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
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to record transaction');
    }
  };

  const handleReject = async () => {
    if (!discardArmed) {
      setDiscardArmed(true);
      return;
    }
    try {
      await rejectMutation.mutateAsync(extraction.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject extraction');
    }
  };

  const busy = confirmMutation.isPending || rejectMutation.isPending;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      locked={busy}
      title="Review AI extraction"
      subtitle={`Model confidence · ${confidencePercent}%`}
      maxHeightRatio={0.94}
    >
      <View style={styles.banner}>
        <Ionicons name="alert-circle" size={20} color={colors.warn} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>PROPOSED DATA · PENDING REVIEW</Text>
          <Text style={styles.bannerText}>
            AI assists data entry; the backend ledger stays authoritative. Verify every number before confirming.
          </Text>
        </View>
      </View>

      {error ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.error}>
          <Ionicons name="close-circle" size={17} color={colors.loss} />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      ) : null}

      {items.length > 1 ? (
        <>
          <Text style={styles.label}>EXTRACTED ITEMS · {items.length}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, flexGrow: 0, marginBottom: 14 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {items.map((it, idx) => (
              <PressableScale
                key={idx}
                onPress={() => setSelectedIdx(idx)}
                scaleTo={0.95}
                style={[styles.chip, selectedIdx === idx && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedIdx === idx && styles.chipTextActive]}>
                  #{idx + 1} · {it.type} · ₹{it.amount}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={styles.label}>TRANSACTION TYPE</Text>
      <View style={styles.typeWrap}>
        {TRANSACTION_TYPES.map((t) => (
          <PressableScale key={t} onPress={() => setType(t)} scaleTo={0.95} style={[styles.chip, type === t && styles.chipActive]}>
            <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
          </PressableScale>
        ))}
      </View>

      <Input label="Amount (INR) *" icon="cash-outline" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 50000.00" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Input label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="20" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Price / rate" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="2500.00" />
        </View>
      </View>
      <Input label="Date (YYYY-MM-DD)" icon="calendar-outline" value={date} onChangeText={setDate} placeholder="2026-04-10" />
      <Input label="Reference / order ID" icon="barcode-outline" value={reference} onChangeText={setReference} placeholder="ORD-98124" />
      <Input label="Notes" icon="create-outline" value={notes} onChangeText={setNotes} placeholder="Brief comment" />

      <View style={{ gap: 10, marginTop: 4 }}>
        <Button title="Confirm & record to ledger" icon="checkmark-circle" onPress={handleConfirm} isLoading={confirmMutation.isPending} disabled={rejectMutation.isPending} />
        <Button
          title={discardArmed ? 'Tap again to discard' : 'Discard proposal'}
          variant={discardArmed ? 'danger' : 'secondary'}
          icon="trash-outline"
          onPress={handleReject}
          isLoading={rejectMutation.isPending}
          disabled={confirmMutation.isPending}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: 10, backgroundColor: colors.warnSoft, borderRadius: 16, padding: 13, marginBottom: 16 },
  bannerTitle: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1, color: colors.warn },
  bannerText: { fontFamily: fonts.sans, fontSize: 12, color: colors.ink2, lineHeight: 18, marginTop: 3 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.lossSoft, padding: 12, borderRadius: 14, marginBottom: 14 },
  errorText: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.loss },
  label: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 1.3, color: colors.muted, marginBottom: 9 },
  typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.8)' },
  chipActive: { backgroundColor: colors.primaryDeep, borderColor: colors.primaryDeep },
  chipText: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.ink2 },
  chipTextActive: { color: colors.white },
});
