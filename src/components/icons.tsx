import Svg, { Circle, Path } from 'react-native-svg';

export interface IconProps {
  color: string;
  size?: number;
}

const STROKE = 1.75;

export function OpenBookIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6.7c-1.15-1.4-2.95-2.2-5.1-2.2H4.2v12.85h2.7c2.15 0 3.95.8 5.1 2.2 1.15-1.4 2.95-2.2 5.1-2.2h2.7V4.5h-2.7c-2.15 0-3.95.8-5.1 2.2Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path d="M12 6.7v12.85" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

export function SearchIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="10.7" cy="10.7" r="5.45" stroke={color} strokeWidth={STROKE} />
      <Path d="M14.9 14.9 19.35 19.35" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

export function EditSheetIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.1 4.6h8l3.15 3.05V19.3H6.1V4.6Z"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path d="M14.05 4.75V7.65h3.05" stroke={color} strokeWidth={STROKE} strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M11.4 20.9 14.34 18.9 19.56 12.35 17.92 11.04 12.7 17.59Z" fill={color} />
      <Circle cx="18.9" cy="11.5" r="1.3" fill={color} />
    </Svg>
  );
}
