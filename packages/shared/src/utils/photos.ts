import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Adding a photo the real way: the device camera or the photo library (storage). The system asks the user for the permission the
// first time; a refusal explains how to allow it. On the web the browser's own file chooser opens (on a phone it offers the camera).
// Every place that attaches a photo calls pickPhotos and keeps the local URIs it returns.

type Source = 'camera' | 'library';

/**
 * Browser tests have no camera or file dialog: they set `globalThis.__ONGARAGE_TEST_PHOTOS__` to a list of image URIs, and these are
 * returned instead. Nothing sets it in the app.
 */
const testPhotos = (): string[] | undefined => (globalThis as { __ONGARAGE_TEST_PHOTOS__?: string[] }).__ONGARAGE_TEST_PHOTOS__;

const chooseSource = (): Promise<Source | null> =>
  Platform.OS === 'web'
    ? Promise.resolve('library')
    : new Promise((resolve) =>
        Alert.alert(
          'ඡායාරූපයක් එක් කරන්න',
          undefined,
          [
            { text: '📷 කැමරාව', onPress: () => resolve('camera') },
            { text: '🖼️ ගැලරිය', onPress: () => resolve('library') },
            { text: 'අවලංගු', style: 'cancel', onPress: () => resolve(null) },
          ],
          { cancelable: true, onDismiss: () => resolve(null) }
        )
      );

const explainDenied = (what: string) =>
  Alert.alert(`${what} භාවිතයට ඉඩ නැත`, 'ඡායාරූප එක් කිරීමට දුරකථනයේ Settings තුළ OnGarage සඳහා ඉඩ දෙන්න.', [
    { text: 'Settings', onPress: () => void Linking.openSettings() },
    { text: 'අවලංගු', style: 'cancel' },
  ]);

/**
 * Lets the user take a photo or choose photos from the device, and returns their URIs (empty when cancelled or not allowed).
 * `max` is how many more may be added; `only` fixes the source (camera or library) instead of asking; more than one can be chosen at once from the library.
 */
export const pickPhotos = async (max = 1, only?: Source): Promise<string[]> => {
  if (max <= 0) return [];
  const fake = testPhotos();
  if (fake) return fake.slice(0, max);
  // A button that means one thing (the camera icon, the attach clip) skips the choice; the web always uses its file chooser.
  const source = Platform.OS === 'web' ? 'library' : only ?? (await chooseSource());
  if (!source) return [];
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) explainDenied('කැමරාව');
        return [];
      }
      const shot = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      return shot.canceled ? [] : shot.assets.map((a) => a.uri).slice(0, max);
    }
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) explainDenied('ගැලරිය');
        return [];
      }
    }
    const chosen = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: max > 1, selectionLimit: max, quality: 0.7 });
    return chosen.canceled ? [] : chosen.assets.map((a) => a.uri).slice(0, max);
  } catch {
    return [];
  }
};

// ---------- Preparing a picture before it is sent (the browser build uses a canvas; the phone build sends the picture as chosen) ----------

const dom = (): any => (globalThis as any).document;
/** Pictures can be edited (drawn on, written on, turned) and shrunk where there is a canvas: the browser build. */
export const canEditPhotos = Platform.OS === 'web' && typeof (globalThis as any).document !== 'undefined';

const loadImage = (uri: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const img = new (globalThis as any).Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = uri;
  });

/** Shrinks a picture to at most `maxSide` pixels on its long side (JPEG); the original is returned when it is small already or nothing can shrink it. */
export const compressPhoto = async (uri: string, maxSide = 1600, quality = 0.82): Promise<string> => {
  if (!canEditPhotos) return uri;
  try {
    const img = await loadImage(uri);
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (k >= 1) return uri;
    const c = dom().createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } catch {
    return uri;
  }
};

/** The picture turned a quarter clockwise. */
export const rotatePhoto = async (uri: string): Promise<string> => {
  if (!canEditPhotos) return uri;
  try {
    const img = await loadImage(uri);
    const c = dom().createElement('canvas');
    c.width = img.naturalHeight;
    c.height = img.naturalWidth;
    const g = c.getContext('2d');
    g.translate(c.width, 0);
    g.rotate(Math.PI / 2);
    g.drawImage(img, 0, 0);
    return c.toDataURL('image/jpeg', 0.92);
  } catch {
    return uri;
  }
};

/** A plain sheet to draw on (the "draw" action of the more menu). */
export const blankPhoto = (w = 1080, h = 1080, color = '#ffffff'): string => {
  if (!canEditPhotos) return '';
  const c = dom().createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.92);
};

export type PhotoEdit = {
  strokes: { color: string; width: number; points: { x: number; y: number }[] }[];
  texts: { text: string; color: string; x: number; y: number; size: number }[];
};

/** Draws the strokes and the texts (placed on a picture shown at `shown` size) onto the picture itself and returns the new picture. */
export const flattenPhoto = async (uri: string, edit: PhotoEdit, shown: { w: number; h: number }): Promise<string> => {
  if (!canEditPhotos) return uri;
  try {
    const img = await loadImage(uri);
    const c = dom().createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const k = shown.w ? img.naturalWidth / shown.w : 1;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    edit.strokes.forEach((s) => {
      if (s.points.length < 2) return;
      g.strokeStyle = s.color;
      g.lineWidth = s.width * k;
      g.beginPath();
      s.points.forEach((p, i) => (i === 0 ? g.moveTo(p.x * k, p.y * k) : g.lineTo(p.x * k, p.y * k)));
      g.stroke();
    });
    edit.texts.forEach((t) => {
      g.font = `bold ${Math.round(t.size * k)}px sans-serif`;
      g.textBaseline = 'top';
      g.shadowColor = 'rgba(0,0,0,0.6)';
      g.shadowBlur = 4 * k;
      g.fillStyle = t.color;
      g.fillText(t.text, t.x * k, t.y * k);
    });
    return c.toDataURL('image/jpeg', 0.92);
  } catch {
    return uri;
  }
};
