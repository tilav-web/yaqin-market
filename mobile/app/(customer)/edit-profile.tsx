import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { usersApi } from '../../src/api/users';
import { useTranslation } from '../../src/i18n';

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { lang } = useTranslation();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user-me'],
    queryFn: usersApi.getMe,
  });

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name && user.first_name !== '-' ? user.first_name : '');
      setLastName(user.last_name && user.last_name !== '-' ? user.last_name : '');
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: () => usersApi.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-me'] });
      Alert.alert(
        lang === 'ru' ? 'Успешно' : 'Muvaffaqiyatli',
        lang === 'ru' ? 'Профиль обновлен' : 'Profil yangilandi',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (e: any) => {
      Alert.alert(
        lang === 'ru' ? 'Ошибка' : 'Xato',
        e?.response?.data?.message ?? (lang === 'ru' ? 'Произошла ошибка' : 'Xato yuz berdi'),
      );
    },
  });

  const handleSave = () => {
    if (!firstName.trim()) {
      Alert.alert(
        lang === 'ru' ? 'Заполните поле' : "Maydonni to'ldiring",
        lang === 'ru' ? 'Введите имя' : 'Ismingizni kiriting',
      );
      return;
    }
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={s.title}>
            {lang === 'ru' ? 'Редактировать профиль' : 'Profilni tahrirlash'}
          </Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>
          {lang === 'ru' ? 'Редактировать профиль' : 'Profilni tahrirlash'}
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar placeholder */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Ionicons name="person" size={40} color={Colors.white} />
          </View>
        </View>

        {/* First name */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>{lang === 'ru' ? 'Имя' : 'Ism'}</Text>
          <View style={s.inputRow}>
            <Ionicons name="person-outline" size={17} color={Colors.textHint} />
            <TextInput
              style={s.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={lang === 'ru' ? 'Введите имя' : 'Ismingizni kiriting'}
              placeholderTextColor={Colors.textHint}
            />
          </View>
        </View>

        {/* Last name */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>{lang === 'ru' ? 'Фамилия' : 'Familiya'}</Text>
          <View style={s.inputRow}>
            <Ionicons name="person-outline" size={17} color={Colors.textHint} />
            <TextInput
              style={s.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder={lang === 'ru' ? 'Введите фамилию' : 'Familiyangizni kiriting'}
              placeholderTextColor={Colors.textHint}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, mutation.isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
          <Text style={s.saveTxt}>
            {mutation.isPending
              ? (lang === 'ru' ? 'Сохраняется...' : 'Saqlanmoqda...')
              : (lang === 'ru' ? 'Сохранить' : 'Saqlash')}
          </Text>
        </TouchableOpacity>

        <View style={{ paddingBottom: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.white },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.lg },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.85,
  },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, paddingLeft: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, height: 52,
    ...Shadow.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg, height: 54,
    ...Shadow.md, marginTop: Spacing.sm,
  },
  saveTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
