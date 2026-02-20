// ---------------------------------------------------------------------------
// Ambient module declarations for optional peer dependencies.
//
// These modules are NOT installed in this package — they are peer deps
// provided by the consumer's Expo app.  The declarations here give
// TypeScript just enough information to compile dynamic imports without
// requiring the actual packages to be present.
// ---------------------------------------------------------------------------

declare module 'react-native-shake' {
  interface ShakeSubscription {
    remove(): void;
  }
  const RNShake: {
    addListener(callback: () => void): ShakeSubscription;
  };
  export default RNShake;
}

declare module 'react-native-view-shot' {
  import type { RefObject } from 'react';

  export function captureRef(
    viewRef: number | RefObject<unknown>,
    options?: {
      format?: 'png' | 'jpg' | 'webm';
      quality?: number;
      result?: 'base64' | 'tmpfile' | 'data-uri';
      width?: number;
      height?: number;
    },
  ): Promise<string>;
}

declare module 'react-native' {
  import type { ReactNode } from 'react';

  export const Platform: {
    OS: string;
    Version: string | number;
  };

  export const Dimensions: {
    get(dim: 'window' | 'screen'): {
      width: number;
      height: number;
      scale: number;
      fontScale: number;
    };
  };

  export const PixelRatio: {
    get(): number;
    getFontScale(): number;
  };

  export const AccessibilityInfo: {
    isScreenReaderEnabled(): Promise<boolean>;
    isReduceMotionEnabled(): Promise<boolean>;
  };

  // ---- Component types needed for annotation toolbar ----
  export type ViewStyle = Record<string, unknown>;
  export type TextStyle = Record<string, unknown>;

  export interface ViewProps {
    style?: ViewStyle | ViewStyle[];
    children?: ReactNode;
    pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
    testID?: string;
    accessible?: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: string;
  }

  export interface TextProps {
    style?: TextStyle | TextStyle[];
    children?: ReactNode;
    numberOfLines?: number;
  }

  export interface TouchableOpacityProps extends ViewProps {
    onPress?: () => void;
    activeOpacity?: number;
    disabled?: boolean;
  }

  export interface GestureResponderEvent {
    nativeEvent: {
      locationX: number;
      locationY: number;
      pageX: number;
      pageY: number;
      timestamp: number;
    };
  }

  export interface PanResponderGestureState {
    dx: number;
    dy: number;
    moveX: number;
    moveY: number;
    x0: number;
    y0: number;
    numberActiveTouches: number;
    stateID: number;
  }

  export interface PanResponderInstance {
    panHandlers: Record<string, unknown>;
  }

  export const PanResponder: {
    create(config: {
      onStartShouldSetPanResponder?: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => boolean;
      onMoveShouldSetPanResponder?: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => boolean;
      onPanResponderGrant?: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => void;
      onPanResponderMove?: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => void;
      onPanResponderRelease?: (
        evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => void;
    }): PanResponderInstance;
  };

  export interface TextInputProps {
    style?: ViewStyle | ViewStyle[];
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    multiline?: boolean;
    numberOfLines?: number;
    maxLength?: number;
    autoFocus?: boolean;
    returnKeyType?: string;
    textAlignVertical?: string;
    editable?: boolean;
    keyboardType?: string;
    secureTextEntry?: boolean;
  }

  export interface ScrollViewProps extends ViewProps {
    contentContainerStyle?: ViewStyle;
    keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
    showsVerticalScrollIndicator?: boolean;
  }

  export interface ModalProps {
    visible?: boolean;
    animationType?: 'none' | 'slide' | 'fade';
    transparent?: boolean;
    onRequestClose?: () => void;
    children?: ReactNode;
  }

  export interface ImageSourcePropType {
    uri?: string;
    width?: number;
    height?: number;
  }

  export interface ImageProps {
    style?: ViewStyle | ViewStyle[];
    source?: ImageSourcePropType | number;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    accessibilityLabel?: string;
  }

  export interface ActivityIndicatorProps {
    size?: 'small' | 'large';
    color?: string;
    animating?: boolean;
  }

  export interface KeyboardAvoidingViewProps extends ViewProps {
    behavior?: 'height' | 'position' | 'padding';
    keyboardVerticalOffset?: number;
  }

  export function View(props: ViewProps): ReactNode;
  export function Text(props: TextProps): ReactNode;
  export function TouchableOpacity(props: TouchableOpacityProps): ReactNode;
  export function TextInput(props: TextInputProps): ReactNode;
  export function ScrollView(props: ScrollViewProps): ReactNode;
  export function Modal(props: ModalProps): ReactNode;
  export function Image(props: ImageProps): ReactNode;
  export function ActivityIndicator(props: ActivityIndicatorProps): ReactNode;
  export function KeyboardAvoidingView(props: KeyboardAvoidingViewProps): ReactNode;

  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle>>(
      styles: T,
    ): T;
    flatten(style: ViewStyle | ViewStyle[] | undefined): ViewStyle;
  };

  export const Linking: {
    openURL(url: string): Promise<void>;
    canOpenURL(url: string): Promise<boolean>;
  };

  export const Alert: {
    alert(
      title: string,
      message?: string,
      buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
      }>,
    ): void;
  };
}

declare module 'expo-device' {
  export const manufacturer: string | null;
  export const modelName: string | null;
  export const modelId: string | null;
  export const deviceType: number | null;
  export const totalMemory: number | null;
  export const deviceName: string | null;
}

declare module 'expo-constants' {
  const Constants: {
    expoConfig?: Record<string, unknown>;
    manifest?: Record<string, unknown>;
  };
  export default Constants;
}

declare module 'expo-battery' {
  export function getBatteryLevelAsync(): Promise<number>;
  export function getBatteryStateAsync(): Promise<number>;
  export function isLowPowerModeEnabledAsync(): Promise<boolean>;
}

declare module 'expo-localization' {
  export function getLocales(): Array<{
    languageCode: string | null;
    regionCode: string | null;
    currencyCode: string | null;
    textDirection: string;
  }>;
  export function getCalendars(): Array<{
    timeZone: string | null;
  }>;
}

declare module 'expo-network' {
  export function getNetworkStateAsync(): Promise<{
    type: string;
    isConnected: boolean;
    isInternetReachable: boolean;
  }>;
}

declare module 'expo-screen-orientation' {
  export function getOrientationAsync(): Promise<number>;
}

declare module '@react-native-community/netinfo' {
  const NetInfo: {
    fetch(): Promise<{
      type: string;
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
    }>;
  };
  export default NetInfo;
}

// ---------------------------------------------------------------------------
// @shopify/react-native-skia — Skia 2.x ambient declarations
// ---------------------------------------------------------------------------

declare module '@shopify/react-native-skia' {
  import type { ReactNode } from 'react';

  // ---- Core value types ----
  export interface SkRect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface SkPoint {
    x: number;
    y: number;
  }

  export interface SkImage {
    width(): number;
    height(): number;
    encodeToBase64(format?: ImageFormat, quality?: number): string;
  }

  export type ImageFormat = 'png' | 'jpeg' | 'webp';

  // ---- SkPath ----
  export interface SkPath {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    close(): void;
    reset(): void;
    copy(): SkPath;
  }

  // ---- Skia static helpers ----
  export const Skia: {
    Path: {
      Make(): SkPath;
    };
    Data: {
      fromBase64(base64: string): SkData;
    };
  };

  export interface SkData {
    dispose(): void;
  }

  export function makeImageFromEncoded(data: SkData): SkImage | null;

  // ---- React components ----
  export interface CanvasProps {
    style?: Record<string, unknown>;
    children?: ReactNode;
    ref?: unknown;
    onTouch?: unknown;
  }

  export interface CanvasRef {
    makeImageSnapshot(): SkImage;
  }

  export function Canvas(props: CanvasProps): ReactNode;

  export interface ImageProps {
    image: SkImage | null;
    x: number;
    y: number;
    width: number;
    height: number;
    fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scaleDown';
  }
  export function Image(props: ImageProps): ReactNode;

  export interface PathProps {
    path: SkPath;
    color?: string;
    style?: 'stroke' | 'fill';
    strokeWidth?: number;
    strokeCap?: 'butt' | 'round' | 'square';
    strokeJoin?: 'miter' | 'round' | 'bevel';
  }
  export function Path(props: PathProps): ReactNode;

  export interface RectProps {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
    style?: 'stroke' | 'fill';
    strokeWidth?: number;
  }
  export function Rect(props: RectProps): ReactNode;

  export interface CircleProps {
    cx: number;
    cy: number;
    r: number;
    color?: string;
    style?: 'stroke' | 'fill';
    strokeWidth?: number;
  }
  export function Circle(props: CircleProps): ReactNode;

  export interface LineProps {
    p1: SkPoint;
    p2: SkPoint;
    color?: string;
    style?: 'stroke' | 'fill';
    strokeWidth?: number;
    strokeCap?: 'butt' | 'round' | 'square';
  }
  export function Line(props: LineProps): ReactNode;

  // ---- Hooks ----
  export function useCanvasRef(): { current: CanvasRef | null };

  export interface TouchInfo {
    x: number;
    y: number;
    force: number;
    type: number;
    id: number;
    timestamp: number;
  }

  export type ExtendedTouchInfo = TouchInfo & {
    velocityX: number;
    velocityY: number;
  };

  export type TouchHandlerCallback = (
    touchInfo: Array<Array<TouchInfo>>,
  ) => void;

  export function useTouchHandler(handlers: {
    onStart?: (info: TouchInfo) => void;
    onActive?: (info: ExtendedTouchInfo) => void;
    onEnd?: (info: TouchInfo) => void;
  }): TouchHandlerCallback;
}
