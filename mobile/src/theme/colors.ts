export const Colors = {
  primary: '#E53935',
  primaryDark: '#B71C1C',
  primaryLight: '#EF9A9A',
  primarySurface: '#FFEBEE',
  primaryBorder: '#FFCDD2',

  black: '#212121',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textHint: '#BDBDBD',

  white: '#FFFFFF',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  divider: '#EEEEEE',

  success: '#4CAF50',
  successSurface: '#E8F5E9',
  warning: '#FF9800',
  warningSurface: '#FFF3E0',
  error: '#F44336',
  errorSurface: '#FFEBEE',
  info: '#2196F3',
  infoSurface: '#E3F2FD',

  overlay: 'rgba(0,0,0,0.5)',
  shimmer: '#F0F0F0',

  // Status colors
  statusPending: '#FF9800',
  statusAccepted: '#2196F3',
  statusReady: '#9C27B0',
  statusDelivering: '#FF5722',
  statusDelivered: '#4CAF50',
  statusCancelled: '#9E9E9E',
} as const;

export type Color = keyof typeof Colors;
