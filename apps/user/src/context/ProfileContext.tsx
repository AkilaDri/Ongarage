import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_USER } from '../constants/mockData';

const STORAGE_KEY = 'ongarage.owner.profile';

export type Gender = 'male' | 'female' | 'other';

/** The owner's details (what a backend account would hold), saved on the device. */
export type OwnerProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  /** YYYY-MM-DD, or empty. */
  birthday: string;
  gender: Gender | '';
  /** Shown as the avatar when set (a sample photo until camera / gallery access). */
  photo: string;
  emergencyName: string;
  emergencyPhone: string;
};

export type ProfileField = keyof OwnerProfile;

const SEED: OwnerProfile = {
  firstName: MOCK_USER.firstName,
  lastName: MOCK_USER.lastName,
  phone: MOCK_USER.phone,
  email: '',
  birthday: '',
  gender: '',
  photo: '',
  emergencyName: '',
  emergencyPhone: '',
};

/** The seven things a complete profile has (the progress bar counts these). */
export const PROFILE_STEPS: { id: string; label: string; done: (p: OwnerProfile) => boolean }[] = [
  { id: 'photo', label: 'පැතිකඩ පින්තූරය', done: (p) => !!p.photo },
  { id: 'name', label: 'සම්පූර්ණ නම', done: (p) => !!p.firstName.trim() && !!p.lastName.trim() },
  { id: 'phone', label: 'ජංගම දුරකථන අංකය', done: (p) => !!p.phone.trim() },
  { id: 'email', label: 'ඊමේල් ලිපිනය', done: (p) => !!p.email.trim() },
  { id: 'birthday', label: 'උපන් දිනය', done: (p) => !!p.birthday },
  { id: 'gender', label: 'ස්ත්‍රී පුරුෂ භාවය', done: (p) => !!p.gender },
  { id: 'emergency', label: 'හදිසි සම්බන්ධතාව', done: (p) => !!p.emergencyName.trim() && !!p.emergencyPhone.trim() },
];

/** Why a value can't be saved (empty = fine). */
export const validateField = (field: ProfileField, value: string): string => {
  const v = value.trim();
  if ((field === 'firstName' || field === 'lastName') && !v) return 'නම හිස් විය නොහැක.';
  if ((field === 'phone' || field === 'emergencyPhone') && v && !/^(\+94|0)\d{9}$/.test(v.replace(/[\s-]/g, ''))) return 'වලංගු ශ්‍රී ලංකා දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0771234567).';
  if (field === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'වලංගු ඊමේල් ලිපිනයක් ඇතුළත් කරන්න.';
  if (field === 'birthday' && v) {
    const d = new Date(v);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime())) return 'දිනය YYYY-MM-DD ආකාරයෙන් ඇතුළත් කරන්න (උදා: 1995-08-21).';
    if (d.getTime() > Date.now()) return 'උපන් දිනය අනාගතයේ විය නොහැක.';
  }
  return '';
};

type ProfileState = {
  profile: OwnerProfile;
  /** Updates several fields at once (already validated by the caller). */
  update: (change: Partial<OwnerProfile>) => void;
  fullName: string;
  initials: string;
  /** How many of PROFILE_STEPS are done. */
  completed: number;
};

const ProfileContext = createContext<ProfileState | null>(null);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<OwnerProfile>(SEED);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setProfile({ ...SEED, ...JSON.parse(raw) });
      })
      .catch(() => {});
  }, []);

  const update = useCallback((change: Partial<OwnerProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...change };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase() || '👤';
  const completed = PROFILE_STEPS.filter((s) => s.done(profile)).length;

  return <ProfileContext.Provider value={{ profile, update, fullName, initials, completed }}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
};
