import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const Typography = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  h4: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  title: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: Colors.textPrimary },
  bodySmall: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400', color: Colors.textHint },
  button: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  buttonSmall: { fontSize: 14, fontWeight: '600' },
  price: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  priceSmall: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
