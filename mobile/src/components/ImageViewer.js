import React, { useState } from 'react';
import { Modal, View, StyleSheet, Pressable, Image, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export function ExpandableImage({ source, style, ...props }) {
  const [modalVisible, setModalVisible] = useState(false);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  return (
    <>
      <Pressable onPress={openModal}>
        <Image source={source} style={style} {...props} />
      </Pressable>
      
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.backdrop}>
            {/* Close button */}
            <Pressable onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="close" size={30} color={colors.white} />
            </Pressable>
            
            {/* Full-screen image */}
            <Pressable onPress={closeModal} style={styles.imageContainer}>
              <Image 
                source={source} 
                style={styles.fullImage}
                resizeMode="contain"
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  fullImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
    maxWidth: screenWidth,
    maxHeight: screenHeight * 0.8,
  },
});

export default ExpandableImage; 