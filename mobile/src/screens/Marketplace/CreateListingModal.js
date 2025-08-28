import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import { spacing } from '../../styles/theme';

export default function CreateListingModal({ visible, onClose, onCreate }) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('furniture'); // furniture | sublets | textbooks | parking | other
  const [locationText, setLocationText] = useState('');
  const [description, setDescription] = useState('');
  const [photosBase64, setPhotosBase64] = useState([]);
  const [nameError, setNameError] = useState('');

  const UT = {
    primary: '#C75100',
    tint: '#FFF3EC',
    danger: '#EF4444',
    cardBg: 'rgba(255,255,255,.92)'
  };

  useEffect(() => {
    if (!visible) return;
    // reset errors on open
    setNameError('');
  }, [visible]);

  const reset = () => {
    setTitle('');
    setPrice('');
    setType('furniture');
    setLocationText('');
    setDescription('');
    setPhotosBase64([]);
    setNameError('');
  };

  const addPhotos = async () => {
    try {
      const pick = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (pick?.assets?.length) {
        const next = [];
        for (const a of pick.assets) {
          if (a.base64) next.push(`data:image/jpeg;base64,${a.base64}`);
        }
        setPhotosBase64((prev) => [...prev, ...next]);
      }
    } catch (_) {}
  };

  const removePhoto = (idx) => {
    setPhotosBase64((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!title.trim()) { setNameError('Please enter a title'); return; }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) { setNameError('Enter a valid price'); return; }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const payload = {
      title: title.trim(),
      price: priceNum,
      type,
      description: description || '',
      locationText: locationText || '',
      photosBase64,
      loc: undefined, // could be added later when map select is implemented
    };
    if (onCreate) await onCreate(payload);
    reset();
    onClose && onClose();
  };

  const disabled = !title.trim() || !price.trim();

  const TYPES = [
    { key: 'furniture', label: 'Furniture', icon: 'bed-outline' },
    { key: 'sublets', label: 'Sublets', icon: 'home-outline' },
    { key: 'textbooks', label: 'Textbooks', icon: 'book-outline' },
    { key: 'parking', label: 'Parking', icon: 'car-outline' },
    { key: 'other', label: 'Other', icon: 'pricetag-outline' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.card, { maxHeight: screenHeight * 0.74, paddingBottom: Math.max(insets.bottom, 16) + 84, backgroundColor: UT.cardBg }]}> 
          <View style={styles.handleContainer}><View style={styles.handle} /></View>

          <View style={[styles.headerRow, { paddingTop: 6 + insets.top * 0.2 }]}> 
            <UTText variant="subtitle" style={{ fontSize: 20, fontFamily: 'Poppins_600SemiBold' }}>New Listing</UTText>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={26} color={UT.primary} />
            </Pressable>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>TITLE</UTText>
                <View style={styles.iconInputRow}>
                  <Ionicons name="cart-outline" size={20} color={UT.primary} style={{ marginRight: 8 }} />
                  <UTInput placeholder="e.g., IKEA Desk" value={title} onChangeText={(t) => { setTitle(t); if (t) setNameError(''); }} style={{ flex: 1 }} />
                </View>
                {nameError ? <UTText style={{ color: UT.danger, marginTop: 6 }}>{nameError}</UTText> : null}
              </View>

              {/* Price */}
              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>PRICE</UTText>
                <View style={styles.iconInputRow}>
                  <Ionicons name="cash-outline" size={20} color={UT.primary} style={{ marginRight: 8 }} />
                  <UTInput placeholder="$0.00" value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ flex: 1 }} />
                </View>
              </View>

              {/* Category */}
              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>CATEGORY</UTText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
                  {TYPES.map((t) => {
                    const selected = type === t.key;
                    return (
                      <Pressable key={t.key} onPress={async () => { setType(t.key); await Haptics.selectionAsync(); }} style={[styles.chip, selected ? { backgroundColor: UT.primary } : { backgroundColor: '#FFFFFF' }]}> 
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name={t.icon} size={18} color={selected ? '#fff' : UT.primary} style={{ marginRight: 6 }} />
                          <UTText style={{ color: selected ? '#fff' : UT.primary, fontFamily: 'Poppins_600SemiBold' }}>{t.label}</UTText>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Location */}
              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>LOCATION</UTText>
                <View style={styles.iconInputRow}>
                  <Ionicons name="location-outline" size={20} color={UT.primary} style={{ marginRight: 8 }} />
                  <UTInput placeholder="Optional (e.g., West Campus)" value={locationText} onChangeText={setLocationText} style={{ flex: 1 }} />
                </View>
              </View>

              {/* Description */}
              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>DESCRIPTION</UTText>
                <UTInput placeholder="Optional details" value={description} onChangeText={setDescription} style={{ minHeight: 90 }} multiline />
              </View>

              {/* Photos */}
              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>PHOTOS</UTText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {photosBase64.map((uri, idx) => (
                    <View key={idx} style={styles.photoWrap}>
                      <Image source={{ uri }} style={{ width: 72, height: 72 }} />
                      <Pressable onPress={() => removePhoto(idx)} style={styles.removeBtn}>
                        <Ionicons name="close" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable onPress={addPhotos} style={[styles.chip, { backgroundColor: '#FFFFFF', height: 44, justifyContent: 'center' }]}> 
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="image-outline" size={18} color={UT.primary} style={{ marginRight: 6 }} />
                      <UTText style={{ color: UT.primary, fontFamily: 'Poppins_600SemiBold' }}>Add Photos</UTText>
                    </View>
                  </Pressable>
                </ScrollView>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
            <UTButton title="Cancel" variant="secondary" onPress={() => { reset(); onClose && onClose(); }} style={{ flex: 1, marginRight: spacing.sm }} />
            <UTButton title="Create" onPress={submit} style={{ flex: 1, marginLeft: spacing.sm }} disabled={disabled} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handleContainer: { alignItems: 'center', paddingTop: 8 },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.15)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, marginTop: 6 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  iconInputRow: { flexDirection: 'row', alignItems: 'center' },
  chip: { height: 44, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 0 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: 'transparent', flexDirection: 'row' },
  photoWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: '#EFEFF4' },
  removeBtn: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
}); 