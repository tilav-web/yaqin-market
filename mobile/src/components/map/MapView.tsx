import { Platform, View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../../theme';

// react-native-maps web da ishlamaydi — faqat native da yuklaymiz
let RNMapView: any = null;
let RNMarker: any = null;
let RNCircle: any = null;
let RNPolyline: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  RNMapView = Maps.default;
  RNMarker = Maps.Marker;
  RNCircle = Maps.Circle;
  RNPolyline = Maps.Polyline;
}

// Web uchun placeholder
function WebPlaceholder({ style }: { style?: any }) {
  return (
    <View style={[webStyles.container, style]}>
      <Text style={webStyles.text}>Xarita faqat mobile ilovada ishlaydi</Text>
    </View>
  );
}

const webStyles = StyleSheet.create({
  container: {
    backgroundColor: '#E8E8E8',
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  text: { color: Colors.textHint, fontSize: 13 },
});

// Eksportlar — web da placeholder, native da haqiqiy komponent
export const MapView = Platform.OS === 'web' ? WebPlaceholder : RNMapView;
export const Marker = RNMarker ?? View;
export const Circle = RNCircle ?? View;
export const Polyline = RNPolyline ?? View;
export default MapView;
