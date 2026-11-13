import { forwardRef } from 'react';
import type { Icon, IconProps } from '@phosphor-icons/react';
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  ArrowsClockwiseIcon,
  ArrowsDownUpIcon,
  BroadcastIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  ChartBarIcon,
  ChatTextIcon,
  CheckIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  CircleIcon,
  ClipboardTextIcon,
  ClockIcon,
  ClockCounterClockwiseIcon,
  CoinsIcon,
  CreditCardIcon,
  CrownIcon,
  DatabaseIcon,
  DeviceMobileIcon,
  DownloadSimpleIcon,
  EyeIcon,
  FileArrowDownIcon,
  FileXlsIcon,
  HardDrivesIcon,
  HeartIcon,
  InfoIcon,
  LightningIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MonitorIcon,
  MicrophoneIcon,
  PencilSimpleLineIcon,
  PercentIcon,
  PhoneIcon,
  PhoneCallIcon,
  PlayIcon,
  PlusIcon,
  PowerIcon,
  PrinterIcon,
  ProhibitIcon,
  QrCodeIcon,
  QuestionIcon,
  ScalesIcon,
  ShareNetworkIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
  SignOutIcon,
  SlidersIcon,
  SlidersHorizontalIcon,
  SquareIcon,
  StackIcon,
  TelevisionIcon,
  TrashIcon,
  TrendUpIcon,
  TruckIcon,
  UploadSimpleIcon,
  UserIcon,
  UserCheckIcon,
  UsersIcon,
  WalletIcon,
  WarningIcon,
  WarningCircleIcon,
  WrenchIcon,
  XIcon
} from '@phosphor-icons/react';

const themedIcon = (Glyph: Icon): Icon => forwardRef<SVGSVGElement, IconProps>((props, ref) => (
  <Glyph aria-hidden={props['aria-label'] ? undefined : true} {...props} ref={ref} weight={props.weight ?? 'duotone'} />
));

export const AlertCircle = /* @__PURE__ */ themedIcon(WarningCircleIcon);
export const AlertTriangle = /* @__PURE__ */ themedIcon(WarningIcon);
export const ArrowLeft = /* @__PURE__ */ themedIcon(ArrowLeftIcon);
export const ArrowRight = /* @__PURE__ */ themedIcon(ArrowRightIcon);
export const Microphone = /* @__PURE__ */ themedIcon(MicrophoneIcon);
export const ArrowUpDown = /* @__PURE__ */ themedIcon(ArrowsDownUpIcon);
export const ArrowUpRight = /* @__PURE__ */ themedIcon(ArrowUpRightIcon);
export const Ban = /* @__PURE__ */ themedIcon(ProhibitIcon);
export const BarChart3 = /* @__PURE__ */ themedIcon(ChartBarIcon);
export const Calendar = /* @__PURE__ */ themedIcon(CalendarBlankIcon);
export const Check = /* @__PURE__ */ themedIcon(CheckIcon);
export const CheckCircle2 = /* @__PURE__ */ themedIcon(CheckCircleIcon);
export const CheckSquare = /* @__PURE__ */ themedIcon(CheckSquareIcon);
export const ChevronDown = /* @__PURE__ */ themedIcon(CaretDownIcon);
export const ChevronRight = /* @__PURE__ */ themedIcon(CaretRightIcon);
export const ChevronUp = /* @__PURE__ */ themedIcon(CaretUpIcon);
export const Circle = /* @__PURE__ */ themedIcon(CircleIcon);
export const Clock = /* @__PURE__ */ themedIcon(ClockIcon);
export const Coins = /* @__PURE__ */ themedIcon(CoinsIcon);
export const CreditCard = /* @__PURE__ */ themedIcon(CreditCardIcon);
export const Crown = /* @__PURE__ */ themedIcon(CrownIcon);
export const Database = /* @__PURE__ */ themedIcon(DatabaseIcon);
export const Download = /* @__PURE__ */ themedIcon(DownloadSimpleIcon);
export const Edit3 = /* @__PURE__ */ themedIcon(PencilSimpleLineIcon);
export const Eye = /* @__PURE__ */ themedIcon(EyeIcon);
export const FileCheck2 = /* @__PURE__ */ themedIcon(ClipboardTextIcon);
export const FileDown = /* @__PURE__ */ themedIcon(FileArrowDownIcon);
export const FileSpreadsheet = /* @__PURE__ */ themedIcon(FileXlsIcon);
export const Heart = /* @__PURE__ */ themedIcon(HeartIcon);
export const HelpCircle = /* @__PURE__ */ themedIcon(QuestionIcon);
export const History = /* @__PURE__ */ themedIcon(ClockCounterClockwiseIcon);
export const Info = /* @__PURE__ */ themedIcon(InfoIcon);
export const Layers = /* @__PURE__ */ themedIcon(StackIcon);
export const Lock = /* @__PURE__ */ themedIcon(LockKeyIcon);
export const LogOut = /* @__PURE__ */ themedIcon(SignOutIcon);
export const MapPin = /* @__PURE__ */ themedIcon(MapPinIcon);
export const MessageSquare = /* @__PURE__ */ themedIcon(ChatTextIcon);
export const Monitor = /* @__PURE__ */ themedIcon(MonitorIcon);
export const Percent = /* @__PURE__ */ themedIcon(PercentIcon);
export const Phone = /* @__PURE__ */ themedIcon(PhoneIcon);
export const PhoneCall = /* @__PURE__ */ themedIcon(PhoneCallIcon);
export const Play = /* @__PURE__ */ themedIcon(PlayIcon);
export const Plus = /* @__PURE__ */ themedIcon(PlusIcon);
export const Power = /* @__PURE__ */ themedIcon(PowerIcon);
export const Printer = /* @__PURE__ */ themedIcon(PrinterIcon);
export const QrCode = /* @__PURE__ */ themedIcon(QrCodeIcon);
export const Radio = /* @__PURE__ */ themedIcon(BroadcastIcon);
export const RefreshCw = /* @__PURE__ */ themedIcon(ArrowsClockwiseIcon);
export const RotateCcw = /* @__PURE__ */ themedIcon(ArrowCounterClockwiseIcon);
export const Scale = /* @__PURE__ */ themedIcon(ScalesIcon);
export const Search = /* @__PURE__ */ themedIcon(MagnifyingGlassIcon);
export const Server = /* @__PURE__ */ themedIcon(HardDrivesIcon);
export const Share2 = /* @__PURE__ */ themedIcon(ShareNetworkIcon);
export const ShieldAlert = /* @__PURE__ */ themedIcon(ShieldWarningIcon);
export const ShieldCheck = /* @__PURE__ */ themedIcon(ShieldCheckIcon);
export const Sliders = /* @__PURE__ */ themedIcon(SlidersIcon);
export const SlidersHorizontal = /* @__PURE__ */ themedIcon(SlidersHorizontalIcon);
export const Smartphone = /* @__PURE__ */ themedIcon(DeviceMobileIcon);
export const Square = /* @__PURE__ */ themedIcon(SquareIcon);
export const Trash2 = /* @__PURE__ */ themedIcon(TrashIcon);
export const TrendingUp = /* @__PURE__ */ themedIcon(TrendUpIcon);
export const Truck = /* @__PURE__ */ themedIcon(TruckIcon);
export const Tv = /* @__PURE__ */ themedIcon(TelevisionIcon);
export const Upload = /* @__PURE__ */ themedIcon(UploadSimpleIcon);
export const User = /* @__PURE__ */ themedIcon(UserIcon);
export const UserCheck = /* @__PURE__ */ themedIcon(UserCheckIcon);
export const Users = /* @__PURE__ */ themedIcon(UsersIcon);
export const Wallet = /* @__PURE__ */ themedIcon(WalletIcon);
export const Wrench = /* @__PURE__ */ themedIcon(WrenchIcon);
export const X = /* @__PURE__ */ themedIcon(XIcon);
export const Zap = /* @__PURE__ */ themedIcon(LightningIcon);
