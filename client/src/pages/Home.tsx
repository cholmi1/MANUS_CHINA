/**
 * Field Ledger design: a calm, precise operations notebook for a one-person
 * business trip. Prefer hierarchy, instant actions, and tactile document cues
 * over dashboard density or decorative cards.
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { LoginConfigurationError, NETLIFY_PROXY_ERROR_EVENT, type ApiProxyIssue } from "@/lib/runtimeNotices";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FolderKanban,
  Info,
  ImagePlus,
  LoaderCircle,
  LogIn,
  Map,
  MapPin,
  Menu,
  Navigation,
  Phone,
  Plane,
  Route,
  Save,
  ReceiptText,
  TrainFront,
  Trash2,
  Utensils,
  X,
} from "lucide-react";

type Area = "days" | "places" | "consultations" | "checklist" | "rest" | "bookings" | "expenses";
type EventTone = "move" | "focus" | "meeting" | "finish";

const areas: Area[] = ["days", "places", "consultations", "checklist", "rest", "bookings", "expenses"];

function getInitialArea(): Area {
  if (typeof window === "undefined") return "days";
  const hash = window.location.hash.replace("#", "");
  return areas.includes(hash as Area) ? hash as Area : "days";
}

type Destination = {
  name: string;
  address: string;
  chinese: string;
  note?: string;
  latitude?: number;
  longitude?: number;
};

type ScheduleEvent = {
  time: string;
  title: string;
  detail: string;
  tone?: EventTone;
  destination?: keyof typeof destinations;
};

type Day = {
  id: string;
  index: string;
  date: string;
  city: string;
  headline: string;
  objective: string;
  focus: string;
  events: ScheduleEvent[];
};

const destinations = {
  hotelShenzhen: {
    name: "Ji호텔 화창베이 전자대하점",
    address: "선전 푸톈구 선난중로 2072호",
    chinese: "深圳市福田区深南中路2072号 全季酒店(华强北电子大厦店)",
    note: "화창루·화창베이역 도보 200m · 9/7–9/9 숙박",
    latitude: 22.5425,
    longitude: 114.0888,
  },
  gaoda: {
    name: "선전 가오다 열압제품",
    address: "선전 룽화구 관란가도 웨더로 20호",
    chinese: "广东省深圳市龙华区观澜街道粤德路20号 深圳市高达热压制品有限公司",
    note: "담당: 廖 선생 · EVA 열압 성형 전문",
  },
  shenzhenAirport: {
    name: "선전 바오안공항 T3",
    address: "선전 바오안 국제공항 제3터미널",
    chinese: "深圳宝安国际机场 T3航站楼",
    latitude: 22.6393,
    longitude: 113.8106,
  },
  hotelYiwu: {
    name: "카이슨 푸샴 호텔",
    address: "이우 처우저우북로 795호",
    chinese: "浙江省义乌市福田街道稠州北路795号 凯森璞尚酒店",
    note: "국제상무성 2구 도보 2–3분 · 9/9–9/11 숙박",
    latitude: 29.334919,
    longitude: 120.10713,
  },
  yiwuMarket: {
    name: "이우 국제상무성 2구",
    address: "이우 처우저우북로 국제상무성 2구",
    chinese: "浙江省义乌市稠州北路 国际商贸城二区",
    note: "포장백·비닐·케이스 핵심 조사 구역",
    latitude: 29.335098,
    longitude: 120.106287,
  },
  yiwuStation: {
    name: "이우역",
    address: "이우 허우자이거리 베이잔대로 333호",
    chinese: "义乌市后宅街道北站大道333号 义乌站",
    latitude: 29.3846,
    longitude: 120.0463,
  },
  seg: {
    name: "SEG 전자시장",
    address: "선전 푸톈구 화창베이로 1002호",
    chinese: "深圳市福田区华强北路1002号 赛格广场",
    note: "USB·케이블 부스 밀집",
    latitude: 22.541493,
    longitude: 114.087134,
  },
  fanlou: {
    name: "판러우 · 광둥 딤섬",
    address: "선전 푸톈구 전화로 118-7호",
    chinese: "深圳市福田区振华路118-7号 饭楼",
    latitude: 22.54463,
    longitude: 114.08357,
  },
  binwang: {
    name: "빈왕 야시장",
    address: "이우 싼팅로 1호",
    chinese: "浙江省义乌市三挺路1号 宾王夜市",
    latitude: 29.312651,
    longitude: 120.090077,
  },
  sofia: {
    name: "Sofia Italian",
    address: "이우 궁런북로 971호 2층",
    chinese: "浙江省义乌市工人北路971号2层 索菲亚意大利餐厅",
    latitude: 29.33518,
    longitude: 120.10176,
  },
} satisfies Record<string, Destination>;

const days: Day[] = [
  {
    id: "d1",
    index: "01",
    date: "9월 7일 · 월",
    city: "선전 진입",
    headline: "지형을 읽고, 내일의 상담처를 고릅니다.",
    objective: "첫날은 계약이 아니라 화창베이 3개 상가의 층별 구조와 동선을 익히는 날입니다.",
    focus: "화창베이 1차 라운딩 · 내일 심화상담 3–4개사 선별",
    events: [
      { time: "04:50", title: "서울 숙소 출발", detail: "배낭과 24L 캐리어만 휴대합니다. 05:20까지 탑승하지 못하면 서울역 공항철도 직통으로 전환합니다.", tone: "move" },
      { time: "08:40\n11:35", title: "대한항공 KE835 · 인천 T2 → 선전 T3", detail: "e-티켓 180-4825439933 · PNR E8BPKY · 비행 3시간 55분", tone: "focus" },
      { time: "13:30", title: "Ji호텔 체크인", detail: "금연층 요청 후 17층 세탁실 위치를 확인합니다.", destination: "hotelShenzhen" },
      { time: "14:00\n18:00", title: "조사 1 · 화창베이 1차 라운딩", detail: "SEG·화창전자세계·위안왕수마청의 층별 배치도를 먼저 확보합니다. USB와 Type-C 각 3개사 위치를 표시하고 명함 15건을 목표로 수집합니다.", tone: "focus", destination: "seg" },
      { time: "18:00", title: "석식 · 윈난 쌀국수", detail: "혼자 빠르게 식사 가능한 곳으로 마칩니다. 첫날은 21시 이전 취침을 우선합니다.", destination: "fanlou" },
    ],
  },
  {
    id: "d2",
    index: "02",
    date: "9월 8일 · 화",
    city: "선전 마감",
    headline: "업체 방문과 선전 정산을 오늘 끝냅니다.",
    objective: "9일 오전 비행으로 이동하므로 샘플 수령, 결제, 택배 발송을 오늘 17시까지 모두 마감해야 합니다.",
    focus: "가오다 EVA 방문 · USB·Type-C 심화상담 · 샘플·정산 마감",
    events: [
      { time: "08:30", title: "호텔 출발 · 관란 이동", detail: "출근시간 혼잡을 감안해 약속 1시간 전에 출발합니다. 디디 이동비는 약 ¥80–110입니다.", tone: "move", destination: "gaoda" },
      { time: "09:30\n11:00", title: "약속 · 가오다 열압제품 방문", detail: "EVA 하드케이스 금형비, 내부 폼 몰딩, 의료기기 납품 실적, MOQ·단가 구간, RoHS·REACH, 결제조건과 공장 라인을 확인합니다.", tone: "meeting", destination: "gaoda" },
      { time: "11:30\n13:00", title: "조사 2 · USB 메모리 심화 상담", detail: "H2testw 실용량 검증, Flash 등급, 컨트롤러 모델, 레이저 로고 단가와 데이터 프리로드 가능 여부를 확인합니다.", tone: "focus", destination: "seg" },
      { time: "13:45\n16:00", title: "조사 3 · Type-C 케이블 교차 견적", detail: "USB-IF, AWG, 정격전류, 굴곡시험, KC·CE·RoHS 서류를 확인하고 동일 품목 3개 부스 견적을 비교합니다.", tone: "focus" },
      { time: "16:00\n17:00", title: "선전 정산 마감", detail: "유상 샘플 3–4개사를 확보하고 대금을 결제합니다. 부피 큰 샘플은 호텔 또는 회사로 발송 처리합니다.", tone: "finish" },
      { time: "18:00", title: "석식 · 판러우 딤섬", detail: "RFQ 위챗 발송과 조사내역 정리 전, 1시간 이내로 식사를 마칩니다.", destination: "fanlou" },
    ],
  },
  {
    id: "d3",
    index: "03",
    date: "9월 9일 · 수",
    city: "이우 이동",
    headline: "내일의 집중상담을 위한 동선을 확정합니다.",
    objective: "오후 도착 후 국제상무성 2구의 부스 위치와 방문 순서를 먼저 확인합니다.",
    focus: "CZ3876 이동 · 2구 1층 사전답사 · 통역 브리핑",
    events: [
      { time: "07:40", title: "체크아웃 → 선전공항 T3", detail: "지하철 11호선을 이용합니다. 국내선 수속 마감 09:45를 기준으로 움직입니다.", tone: "move", destination: "shenzhenAirport" },
      { time: "10:45\n12:45", title: "중국남방항공 CZ3876 · 선전 → 이우", detail: "e-티켓 784-2306284093 · 수하물은 위탁수하물 활용", tone: "focus" },
      { time: "13:20", title: "카이슨 푸샴 호텔 체크인", detail: "체크인이 늦어지면 프런트에 ‘寄存行李’로 짐 보관을 요청합니다.", destination: "hotelYiwu" },
      { time: "14:00\n17:00", title: "조사 4 · 국제상무성 2구 1F 사전답사", detail: "포장백·비닐 구역을 훑고 사전 확보 부스 10037A·10421·12052A를 확인합니다. Amap 오프라인 지도에 핀을 고정합니다.", tone: "focus", destination: "yiwuMarket" },
      { time: "18:30", title: "석식 겸 빈왕 야시장", detail: "식사와 함께 소매 패키지 트렌드를 가볍게 확인합니다. 생냉식은 피합니다.", destination: "binwang" },
    ],
  },
  {
    id: "d4",
    index: "04",
    date: "9월 10일 · 목",
    city: "이우 핵심일",
    headline: "파우치·포장비닐·완충재의 조건을 좁힙니다.",
    objective: "상무성은 17시에 닫힙니다. 이 하루가 출장 중 가장 밀도 높은 조사 시간입니다.",
    focus: "파우치 5개사 · 3F·4F 교차견적 · 재방문 협상",
    events: [
      { time: "09:00\n11:30", title: "조사 5 · 2구 1F 파우치 집중", detail: "EVA 하드케이스 금형비와 폼 몰딩 정밀도를 확인합니다. 지퍼형 소프트 파우치는 업체별 3개 샘플을 수령하고 인쇄판비를 별도 견적합니다.", tone: "focus", destination: "yiwuMarket" },
      { time: "11:30\n12:30", title: "상무성 푸드코트 중식", detail: "점포 점심 휴식과 겹치는 시간을 식사에 사용합니다.", tone: "move" },
      { time: "12:30\n15:00", title: "조사 6 · 2구 3F·4F 교차 견적", detail: "3F에서 USB·케이블의 선전 단가를 교차 검증하고, 4F에서 캐링케이스 제조사 직영 부스를 접촉합니다.", tone: "focus", destination: "yiwuMarket" },
      { time: "15:00\n17:00", title: "조사 7 · 재방문 협상 및 완충재", detail: "최저가 2개사를 재방문해 실측·재질·금형비를 확정합니다. 부직포·EVA 대체 소재와 에어쿠션·EPE를 비교합니다.", tone: "finish" },
      { time: "17:00", title: "호텔 복귀 · 비교표와 Short-list", detail: "업체별 위챗 그룹방을 만들고, 미결 항목을 다음 날 아침 목록으로 정리합니다.", destination: "hotelYiwu" },
      { time: "18:00", title: "석식 · Sofia Italian", detail: "이우는 영어 메뉴 식당이 많아 주문 부담이 적습니다.", destination: "sofia" },
    ],
  },
  {
    id: "d5",
    index: "05",
    date: "9월 11일 · 금",
    city: "귀국 연결",
    headline: "신규 발굴보다 귀국 연결을 우선합니다.",
    objective: "오전은 미결 정리 전용입니다. 이후에는 고속철-공항-항공편 연결 여유를 지키는 데 집중합니다.",
    focus: "미결 정리 · 이우역 이동 · 항저우 경유 귀국",
    events: [
      { time: "09:00\n09:40", title: "조사 8 · 미결사항 마무리", detail: "샘플 최종 수령과 결제를 마감합니다. 신규 업체 발굴은 하지 않습니다.", tone: "focus", destination: "yiwuMarket" },
      { time: "09:50", title: "체크아웃 → 이우역", detail: "역 보안검색을 감안합니다. 샘플이 많으면 여유 시간을 더 잡습니다.", tone: "move", destination: "yiwuStation" },
      { time: "11:34\n12:20", title: "이우역 → 항저우동역 고속철", detail: "일등석 · 예약 1400828874540926 · PIN 3451 · 여권으로 개찰합니다.", tone: "focus" },
      { time: "12:40\n13:20", title: "항저우공항 T4 이동", detail: "역 구내 도보 후 지하철 19호선으로 이동합니다. 20분 이상 지연되면 즉시 항공사 연락과 택시 전환을 검토합니다.", tone: "move" },
      { time: "15:10\n18:15", title: "아시아나 OZ360 · 항저우 T4 → 인천 T2", detail: "수속 마감 14:10 · e-티켓 988-7505073140 · PNR CJXZY7", tone: "finish" },
    ],
  },
];

const consultationItems = [
  "상호(중문/영문) · 담당자 · 휴대폰 · 위챗 ID",
  "부스 위치 — 구역 / 층 / 게이트 / 부스번호",
  "재질 · 규격(mm) · 두께 · 색상 · 인쇄방식",
  "단가 · 수량 구간별 단가 · MOQ",
  "금형비와 인쇄판비를 분리한 견적",
  "샘플·양산 리드타임 및 초도 납기",
  "RoHS / REACH 성적서 가능 여부와 사진",
  "유상 샘플 라벨링 + 부스 전경·명함 동시 촬영",
];

const checklistGroups = [
  {
    id: "departure",
    label: "출발 전 준비",
    items: [
      "여권 · 비자 · 전자입국신고 QR을 한 폴더에 저장",
      "Alipay · WeChat 카드 등록과 소액 결제 시험",
      "중문·영문 명함 200매와 CVT200 중문 스펙시트",
      "출장용 eSIM · 로밍 · VPN 접속 여부 확인",
    ],
  },
  {
    id: "reservation",
    label: "예약 진행 및 증빙",
    items: [
      "이우 통역 예약 — 9/9–9/10, 일 ¥350–400",
      "원주행 시외버스 예매 — T2 막차 20:10",
      "항공·숙소·고속철 예약 확인서 업로드",
      "해외여행자 보험 증권과 비상연락처 저장",
    ],
  },
];

const expenseCategories = [["transport", "교통비"], ["meals", "식대"], ["lodging", "숙박"], ["communication", "통신"], ["samples", "샘플·구매"], ["interpreter", "통역"], ["fees", "수수료"], ["other", "기타"]] as const;
type ChecklistDraft = { note: string; isChecked: boolean };
type ExpenseDraft = { id?: number; category: string; title: string; amount: string; currency: "KRW" | "CNY" | "USD"; spentAt: string; note: string };
const blankExpenseDraft = (): ExpenseDraft => ({ category: "transport", title: "", amount: "", currency: "KRW", spentAt: new Date().toISOString().slice(0, 10), note: "" });

const researchSections = [
  {
    label: "선전 · 전자 부자재",
    image: "/manus-storage/cvt200-shenzhen-marker_709994b3.png",
    imageAlt: "선전 전자상가를 상징하는 추상 콜라주",
    cards: [
      ["SEG 전자시장", "USB·케이블 부스 밀집", "선전 푸톈구 화창베이로 1002호. 1층부터 훑지 말고 안내데스크에서 층별 배치도를 먼저 확보합니다.", "seg"],
      ["화창전자세계", "액세서리·케이블 특화", "OEM/ODM과 레이저 로고 인쇄 대응 부스가 많습니다. 동일 품목은 최소 3개사 교차 견적합니다.", "seg"],
      ["위안왕 수마청", "USB·메모리카드 전문", "실용량 미달 제품을 피하기 위해 현장에서 H2testw 검증을 요청합니다.", "seg"],
      ["가오다 열압제품", "EVA 케이스 약속", "의료기기·정밀기기 케이스 실적, 폼 몰딩, 금형 소유권을 집중 확인합니다.", "gaoda"],
    ],
  },
  {
    label: "이우 · 포장 부재료",
    image: "/manus-storage/cvt200-yiwu-marker_5558cd4c.png",
    imageAlt: "이우 패키징 소싱을 상징하는 추상 콜라주",
    cards: [
      ["국제상무성 2구 1F", "핵심 목표 · 포장백 구역", "파우치·EVA 케이스·포장비닐 점포가 집중돼 있습니다. 샘플 캐리어도 이 구역에서 검토합니다.", "yiwuMarket"],
      ["국제상무성 2구 3F", "USB·케이블 교차 검증", "선전 단가와 비교해 협상 기준을 만들고, 서류 대응 가능 여부를 함께 확인합니다.", "yiwuMarket"],
      ["국제상무성 2구 4F", "캐링케이스 제조사", "공장 직영 부스와 한국관을 포함해 케이스 제조사를 직접 접촉합니다.", "yiwuMarket"],
      ["사전 확보 부스", "10037A · 10421 · 12052A", "9/9 답사 때 게이트와 층을 확인한 뒤 9/10 방문 순서를 확정합니다.", "yiwuMarket"],
    ],
  },
];

const bookings = [
  ["항공 ①", "KE835 · 인천 T2 → 선전 T3", "9/7 08:40–11:35", "180-4825439933", "317,150원"],
  ["항공 ②", "CZ3876 · 선전 → 이우", "9/9 10:45–12:45", "784-2306284093", "161,600원"],
  ["고속철", "이우역 → 항저우동역 · 일등석", "9/11 11:34", "1400828874540926 · PIN 3451", "14,000원"],
  ["항공 ③", "OZ360 · 항저우 T4 → 인천 T2", "9/11 15:10–18:15", "988-7505073140 · PNR CJXZY7", "388,600원"],
  ["숙박 ①", "Ji호텔 선전 화창베이", "9/7–9/9 · 2박", "1400828287312843", "195,650원"],
  ["숙박 ②", "카이슨 푸샴 호텔 · 이우", "9/9–9/11 · 2박", "1400828287851413", "130,026원"],
];

const emergency = [
  ["주광저우 총영사관", "+86-20-2919-2999", "선전 관할 · 긴급 +86-139-2247-3457"],
  ["주상하이 총영사관", "+86-21-6295-5000", "이우 관할 · 긴급 +86-138-1650-9503"],
  ["영사콜센터", "+82-2-3210-0404", "24시간 · 여권 분실 시 최우선"],
  ["중국 긴급번호", "경찰 110 · 소방 119 · 응급 120", "중국어 응대 원칙 · 호텔 프런트 경유 권장"],
];

function getTripStatus() {
  const today = new Date();
  const start = new Date(2026, 8, 7);
  const end = new Date(2026, 8, 11, 23, 59, 59);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.ceil((start.getTime() - midnight.getTime()) / 86400000);
  if (today > end) return { label: "일정 종료", detail: "귀국 완료", activeDay: "d1" };
  if (diff > 0) return { label: `D-${diff}`, detail: "출발까지", activeDay: "d1" };
  if (diff === 0) return { label: "D-DAY", detail: "오늘 출발합니다", activeDay: "d1" };
  const day = Math.min(5, 1 - diff);
  return { label: `DAY ${day}`, detail: `출장 ${day}일차`, activeDay: `d${day}` };
}

function getMapUrls(destination: Destination) {
  const query = encodeURIComponent(destination.chinese);
  const google = destination.latitude && destination.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
  return { google, amap: `https://ditu.amap.com/search?query=${query}` };
}

function readPhotoAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("사진 파일을 읽지 못했습니다."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] ?? "");
    };
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const fieldRecordsQuery = trpc.fieldRecords.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const upsertRecordMutation = trpc.fieldRecords.upsert.useMutation();
  const uploadPhotoMutation = trpc.fieldRecords.uploadPhoto.useMutation();
  const deletePhotoMutation = trpc.fieldRecords.deletePhoto.useMutation();
  const updatePhotoCaptionMutation = trpc.fieldRecords.updatePhotoCaption.useMutation();
  const exportRecordsMutation = trpc.vendors.export.useMutation();
  const tripChecklistQuery = trpc.tripChecklist.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const upsertTripChecklistMutation = trpc.tripChecklist.upsert.useMutation();
  const uploadChecklistEvidenceMutation = trpc.tripChecklist.uploadEvidence.useMutation();
  const deleteChecklistEvidenceMutation = trpc.tripChecklist.deleteEvidence.useMutation();
  const expensesQuery = trpc.expenses.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const upsertExpenseMutation = trpc.expenses.upsert.useMutation();
  const deleteExpenseMutation = trpc.expenses.delete.useMutation();
  const uploadReceiptMutation = trpc.expenses.uploadReceipt.useMutation();
  const deleteReceiptMutation = trpc.expenses.deleteReceipt.useMutation();
  const vendorsQuery = trpc.vendors.list.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const upsertVendorMutation = trpc.vendors.upsert.useMutation();
  const deleteVendorMutation = trpc.vendors.delete.useMutation();
  const upsertVendorConsultationMutation = trpc.vendors.upsertConsultation.useMutation();
  const uploadVendorConsultationPhotoMutation = trpc.vendors.uploadConsultationPhoto.useMutation();
  const updateVendorPhotoCaptionMutation = trpc.vendors.updateConsultationPhotoCaption.useMutation();
  const deleteVendorPhotoMutation = trpc.vendors.deleteConsultationPhoto.useMutation();

  const tripStatus = useMemo(getTripStatus, []);
  const [area, setArea] = useState<Area>(getInitialArea);
  const [activeDay, setActiveDay] = useState(tripStatus.activeDay);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [toast, setToast] = useState("");
  const [isStartingLogin, setIsStartingLogin] = useState(false);
  const [loginSetupError, setLoginSetupError] = useState("");
  const [apiProxyIssue, setApiProxyIssue] = useState<ApiProxyIssue | null>(null);
  const [recordDrafts, setRecordDrafts] = useState<Record<string, { note: string; isChecked: boolean; vendorName: string }>>({});
  const [photoCaptionDrafts, setPhotoCaptionDrafts] = useState<Record<number, string>>({});
  const [checklistDrafts, setChecklistDrafts] = useState<Record<string, ChecklistDraft>>({});
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(blankExpenseDraft);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorDraft, setVendorDraft] = useState({ id: undefined as number | undefined, name: "", contactName: "", booth: "" });
  const [vendorConsultationDrafts, setVendorConsultationDrafts] = useState<Record<string, ChecklistDraft>>({});
  const [vendorPhotoCaptionDrafts, setVendorPhotoCaptionDrafts] = useState<Record<number, string>>({});
  const [savingRecordKey, setSavingRecordKey] = useState<string | null>(null);
  const [uploadingRecordKey, setUploadingRecordKey] = useState<string | null>(null);
  const [savingCaptionId, setSavingCaptionId] = useState<number | null>(null);
  const [savingChecklistKey, setSavingChecklistKey] = useState<string | null>(null);
  const [uploadingChecklistKey, setUploadingChecklistKey] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [savingVendorRecordKey, setSavingVendorRecordKey] = useState<string | null>(null);
  const [uploadingVendorRecordKey, setUploadingVendorRecordKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => event.key === "Escape" && setSelectedDestination(null);
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, []);

  useEffect(() => {
    const syncArea = () => setArea(getInitialArea());
    window.addEventListener("hashchange", syncArea);
    return () => window.removeEventListener("hashchange", syncArea);
  }, []);

  useEffect(() => {
    const showProxyIssue = (event: Event) => setApiProxyIssue((event as CustomEvent<ApiProxyIssue>).detail ?? { message: "API 프록시 연결을 확인하지 못했습니다." });
    window.addEventListener(NETLIFY_PROXY_ERROR_EVENT, showProxyIssue);
    return () => window.removeEventListener(NETLIFY_PROXY_ERROR_EVENT, showProxyIssue);
  }, []);

  const currentDay = days.find((day) => day.id === activeDay) ?? days[0];
  const storedRecords = useMemo(() => Object.fromEntries((fieldRecordsQuery.data ?? []).map((record) => [record.recordKey, record])), [fieldRecordsQuery.data]);
  const storedChecklist = useMemo(() => Object.fromEntries((tripChecklistQuery.data ?? []).map((item) => [item.itemKey, item])), [tripChecklistQuery.data]);
  const selectedVendor = useMemo(() => (vendorsQuery.data ?? []).find((vendor) => vendor.id === selectedVendorId) ?? (vendorsQuery.data ?? [])[0] ?? null, [vendorsQuery.data, selectedVendorId]);
  const getRecordValue = (recordKey: string) => recordDrafts[recordKey] ?? { note: storedRecords[recordKey]?.note ?? "", isChecked: storedRecords[recordKey]?.isChecked ?? false, vendorName: storedRecords[recordKey]?.vendorName ?? "" };
  const getChecklistValue = (itemKey: string): ChecklistDraft => checklistDrafts[itemKey] ?? { note: storedChecklist[itemKey]?.note ?? "", isChecked: storedChecklist[itemKey]?.isChecked ?? false };
  const checkTotal = checklistGroups.flatMap((group) => group.items.map((_, index) => `${group.id}-${index}`));
  const completed = checkTotal.filter((id) => getChecklistValue(id).isChecked).length;
  const progress = Math.round((completed / checkTotal.length) * 100);
  const consultationCompleted = consultationItems.filter((_, index) => selectedVendor?.consultations.find((record) => record.recordKey === `record-${index}`)?.isChecked).length;
  const expenseTotals = useMemo(() => (expensesQuery.data ?? []).reduce<Record<string, number>>((totals, expense) => ({ ...totals, [expense.currency]: (totals[expense.currency] ?? 0) + expense.amount }), {}), [expensesQuery.data]);
  const heroAction = tripStatus.label.startsWith("D-")
    ? { label: "출발 전 우선", value: "이우 통역 예약", detail: "9/9–9/10 · 일 ¥350–400" }
    : { label: "오늘의 다음 행동", value: currentDay.events[0]?.title ?? "일정 확인", detail: currentDay.events[0]?.time.replace("\n", " — ") ?? "" };

  const navigate = (nextArea: Area) => {
    setArea(nextArea);
    window.history.replaceState(null, "", `#${nextArea}`);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const requestLogin = () => {
    if (isStartingLogin) return;
    setLoginSetupError("");
    setIsStartingLogin(true);
    window.requestAnimationFrame(() => {
      try {
        startLogin();
        window.setTimeout(() => setIsStartingLogin(false), 1400);
      } catch (error) {
        setIsStartingLogin(false);
        if (error instanceof LoginConfigurationError) {
          setLoginSetupError(error.message);
          return;
        }
        console.error(error);
        setToast("로그인 연결을 시작하지 못했습니다. 네트워크 상태를 확인해 주세요.");
      }
    });
  };

  const handleCopy = async () => {
    if (!selectedDestination) return;
    try {
      await navigator.clipboard.writeText(selectedDestination.chinese);
      setToast("중문 주소를 복사했습니다.");
    } catch {
      setToast("주소를 길게 눌러 복사해 주세요.");
    }
  };

  const saveRecord = async (recordKey: string, label: string, nextValue = getRecordValue(recordKey)) => {
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    setSavingRecordKey(recordKey);
    try {
      await upsertRecordMutation.mutateAsync({ recordKey, label, vendorName: nextValue.vendorName, note: nextValue.note, isChecked: nextValue.isChecked });
      await utils.fieldRecords.list.invalidate();
      setRecordDrafts((current) => {
        const next = { ...current };
        delete next[recordKey];
        return next;
      });
      setToast("상담 기록을 저장했습니다.");
    } catch {
      setToast("기록을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSavingRecordKey(null);
    }
  };

  const updateRecordDraft = (recordKey: string, patch: Partial<{ note: string; isChecked: boolean; vendorName: string }>) => {
    setRecordDrafts((current) => ({ ...current, [recordKey]: { ...getRecordValue(recordKey), ...patch } }));
  };

  const updateChecklistDraft = (itemKey: string, patch: Partial<ChecklistDraft>) => setChecklistDrafts((current) => ({ ...current, [itemKey]: { ...getChecklistValue(itemKey), ...patch } }));

  const saveChecklist = async (itemKey: string, groupKey: string, label: string, nextValue = getChecklistValue(itemKey)) => {
    if (!isAuthenticated) return requestLogin();
    setSavingChecklistKey(itemKey);
    try {
      await upsertTripChecklistMutation.mutateAsync({ itemKey, groupKey, label, note: nextValue.note, isChecked: nextValue.isChecked });
      await utils.tripChecklist.list.invalidate();
      setChecklistDrafts((current) => { const next = { ...current }; delete next[itemKey]; return next; });
      setToast("체크리스트를 저장했습니다.");
    } catch { setToast("체크리스트를 저장하지 못했습니다."); } finally { setSavingChecklistKey(null); }
  };

  const handleChecklistEvidenceUpload = async (itemKey: string, groupKey: string, label: string, file?: File) => {
    if (!file) return;
    if (!isAuthenticated) return requestLogin();
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 10 * 1024 * 1024) return setToast("JPG, PNG, WEBP, PDF 파일을 10MB 이하로 올려주세요.");
    setUploadingChecklistKey(itemKey);
    try {
      const current = getChecklistValue(itemKey);
      await uploadChecklistEvidenceMutation.mutateAsync({ itemKey, groupKey, label, note: current.note, isChecked: current.isChecked, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf", dataBase64: await readPhotoAsBase64(file) });
      await utils.tripChecklist.list.invalidate();
      setToast("증빙 파일을 첨부했습니다.");
    } catch { setToast("증빙 파일을 올리지 못했습니다."); } finally { setUploadingChecklistKey(null); }
  };

  const deleteChecklistEvidence = async (evidenceId: number) => {
    try { await deleteChecklistEvidenceMutation.mutateAsync({ evidenceId }); await utils.tripChecklist.list.invalidate(); setToast("증빙 파일을 삭제했습니다."); } catch { setToast("증빙 파일을 삭제하지 못했습니다."); }
  };

  const saveExpense = async () => {
    if (!isAuthenticated) return requestLogin();
    const amount = Number(expenseDraft.amount.replaceAll(",", ""));
    if (!expenseDraft.title.trim() || !Number.isInteger(amount) || amount < 0) return setToast("비용명과 0 이상의 금액을 입력해 주세요.");
    setSavingExpense(true);
    try {
      const saved = await upsertExpenseMutation.mutateAsync({ id: expenseDraft.id, category: expenseDraft.category, title: expenseDraft.title.trim(), amount, currency: expenseDraft.currency, spentAt: new Date(`${expenseDraft.spentAt}T12:00:00`), note: expenseDraft.note });
      setExpenseDraft((current) => ({ ...current, id: saved.id }));
      await utils.expenses.list.invalidate();
      setToast("비용 항목을 저장했습니다. 영수증도 첨부할 수 있습니다.");
    } catch { setToast("비용 항목을 저장하지 못했습니다."); } finally { setSavingExpense(false); }
  };

  const handleReceiptUpload = async (file?: File) => {
    if (!file) return;
    if (!expenseDraft.id) return setToast("먼저 비용 항목을 저장한 뒤 영수증을 첨부해 주세요.");
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 10 * 1024 * 1024) return setToast("JPG, PNG, WEBP, PDF 파일을 10MB 이하로 올려주세요.");
    setUploadingReceipt(true);
    try {
      await uploadReceiptMutation.mutateAsync({ expenseId: expenseDraft.id, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf", dataBase64: await readPhotoAsBase64(file) });
      await utils.expenses.list.invalidate();
      setToast("영수증 파일을 첨부했습니다.");
    } catch { setToast("영수증 파일을 올리지 못했습니다."); } finally { setUploadingReceipt(false); }
  };

  const handlePhotoUpload = async (recordKey: string, label: string, file?: File) => {
    if (!file) return;
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setToast("JPG, PNG, WEBP 사진만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setToast("사진은 8MB 이하로 업로드해 주세요.");
      return;
    }
    setUploadingRecordKey(recordKey);
    try {
      const current = getRecordValue(recordKey);
      const dataBase64 = await readPhotoAsBase64(file);
      await uploadPhotoMutation.mutateAsync({
        recordKey,
        label,
        vendorName: current.vendorName,
        note: current.note,
        isChecked: current.isChecked,
        fileName: file.name,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
        dataBase64,
      });
      await utils.fieldRecords.list.invalidate();
      setToast("현장 사진을 첨부했습니다.");
    } catch (error) {
      console.error(error);
      setToast("사진을 올리지 못했습니다. 연결 상태를 확인해 주세요.");
    } finally {
      setUploadingRecordKey(null);
    }
  };

  const handlePhotoDelete = async (photoId: number) => {
    try {
      await deletePhotoMutation.mutateAsync({ photoId });
      await utils.fieldRecords.list.invalidate();
      setToast("첨부 사진을 목록에서 삭제했습니다.");
    } catch {
      setToast("사진을 삭제하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const savePhotoCaption = async (photoId: number, nextCaption: string) => {
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    setSavingCaptionId(photoId);
    try {
      await updatePhotoCaptionMutation.mutateAsync({ photoId, caption: nextCaption.trim() });
      await utils.fieldRecords.list.invalidate();
      setPhotoCaptionDrafts((current) => {
        const next = { ...current };
        delete next[photoId];
        return next;
      });
      setToast("사진 캡션을 저장했습니다.");
    } catch {
      setToast("사진 캡션을 저장하지 못했습니다.");
    } finally {
      setSavingCaptionId(null);
    }
  };

  const vendorRecordDraftKey = (vendorId: number, recordKey: string) => `${vendorId}:${recordKey}`;
  const getVendorRecordValue = (vendorId: number, recordKey: string): ChecklistDraft => vendorConsultationDrafts[vendorRecordDraftKey(vendorId, recordKey)] ?? { note: selectedVendor?.consultations.find((record) => record.recordKey === recordKey)?.note ?? "", isChecked: selectedVendor?.consultations.find((record) => record.recordKey === recordKey)?.isChecked ?? false };
  const updateVendorRecordDraft = (vendorId: number, recordKey: string, patch: Partial<ChecklistDraft>) => setVendorConsultationDrafts((current) => ({ ...current, [vendorRecordDraftKey(vendorId, recordKey)]: { ...getVendorRecordValue(vendorId, recordKey), ...patch } }));

  const saveVendor = async () => {
    if (!isAuthenticated) return requestLogin();
    if (!vendorDraft.name.trim()) return setToast("업체명을 입력해 주세요.");
    setSavingVendor(true);
    try {
      const saved = await upsertVendorMutation.mutateAsync({ id: vendorDraft.id, name: vendorDraft.name.trim(), contactName: vendorDraft.contactName.trim(), booth: vendorDraft.booth.trim() });
      await utils.vendors.list.invalidate();
      setSelectedVendorId(saved.id);
      setVendorDraft({ id: saved.id, name: saved.name, contactName: saved.contactName, booth: saved.booth });
      setToast("업체 폴더를 저장했습니다.");
    } catch { setToast("업체 폴더를 저장하지 못했습니다."); } finally { setSavingVendor(false); }
  };

  const selectVendor = (vendor: NonNullable<typeof selectedVendor>) => {
    setSelectedVendorId(vendor.id);
    setVendorDraft({ id: vendor.id, name: vendor.name, contactName: vendor.contactName, booth: vendor.booth });
  };

  const deleteSelectedVendor = async () => {
    if (!selectedVendor || !window.confirm(`${selectedVendor.name} 업체 폴더와 상담 기록을 삭제할까요?`)) return;
    try {
      await deleteVendorMutation.mutateAsync({ vendorId: selectedVendor.id });
      await utils.vendors.list.invalidate();
      setSelectedVendorId(null);
      setVendorDraft({ id: undefined, name: "", contactName: "", booth: "" });
      setToast("업체 폴더를 삭제했습니다.");
    } catch { setToast("업체 폴더를 삭제하지 못했습니다."); }
  };

  const saveVendorConsultation = async (vendorId: number, recordKey: string, label: string, nextValue = getVendorRecordValue(vendorId, recordKey)) => {
    setSavingVendorRecordKey(recordKey);
    try {
      await upsertVendorConsultationMutation.mutateAsync({ vendorId, recordKey, label, note: nextValue.note, isChecked: nextValue.isChecked });
      await utils.vendors.list.invalidate();
      setVendorConsultationDrafts((current) => { const next = { ...current }; delete next[vendorRecordDraftKey(vendorId, recordKey)]; return next; });
      setToast("업체 상담 기록을 저장했습니다.");
    } catch { setToast("업체 상담 기록을 저장하지 못했습니다."); } finally { setSavingVendorRecordKey(null); }
  };

  const uploadVendorConsultationPhoto = async (vendorId: number, recordKey: string, label: string, file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) return setToast("JPG, PNG, WEBP 사진을 8MB 이하로 올려주세요.");
    setUploadingVendorRecordKey(recordKey);
    try {
      const value = getVendorRecordValue(vendorId, recordKey);
      await uploadVendorConsultationPhotoMutation.mutateAsync({ vendorId, recordKey, label, note: value.note, isChecked: value.isChecked, fileName: file.name, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", dataBase64: await readPhotoAsBase64(file) });
      await utils.vendors.list.invalidate();
      setToast("업체 상담 사진을 첨부했습니다.");
    } catch { setToast("상담 사진을 올리지 못했습니다."); } finally { setUploadingVendorRecordKey(null); }
  };

  const saveVendorPhotoCaption = async (photoId: number, caption: string) => {
    try {
      await updateVendorPhotoCaptionMutation.mutateAsync({ photoId, caption: caption.trim() });
      await utils.vendors.list.invalidate();
      setVendorPhotoCaptionDrafts((current) => { const next = { ...current }; delete next[photoId]; return next; });
    } catch { setToast("상담 사진 캡션을 저장하지 못했습니다."); }
  };

  const handleExportRecords = async () => {
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    try {
      const exported = await exportRecordsMutation.mutateAsync();
      const binary = window.atob(exported.dataBase64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: exported.mimeType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = exported.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast(`${exported.recordCount}개 상담 기록을 엑셀로 내보냈습니다.`);
    } catch (error) {
      console.error(error);
      setToast("엑셀 파일을 만들지 못했습니다. 다시 시도해 주세요.");
    }
  };

  return (
    <div className="field-app">
      <header className="site-header">
        <div className="shell header-inner">
          <button className="brand" type="button" onClick={() => navigate("days")} aria-label="현장수첩 첫 화면">
            <img src="/manus-storage/cvt200-field-mark_bdcffeb1.png" alt="" />
            <span>
              <b>CVT200</b>
              <em>FIELD LEDGER</em>
            </span>
          </button>
          <div className="header-actions">
            <div className="trip-chip"><span>{tripStatus.label}</span><small>{tripStatus.detail}</small></div>
            <button className="menu-trigger" type="button" aria-label="메뉴 열기" onClick={() => setMobileOpen((open) => !open)}><Menu size={20} /></button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-art" role="img" aria-label="인천에서 선전과 이우를 거쳐 돌아오는 출장 여정 이미지" />
        <div className="shell hero-content">
          <span className="eyebrow"><Route size={14} /> 2026.09.07 — 09.11 · 4박 5일</span>
          <h1>중국 출장의<br /><i>다음 행동을</i> 정리합니다.</h1>
          <p>CVT200 부재료 소싱 · 선전에서 이우까지. 시간, 주소, 현장 기록을 한 권의 운영 수첩으로 관리합니다.</p>
          <div className="hero-ops-board" aria-label="출장 운영 현황">
            <div className="hero-primary-action"><span>{heroAction.label}</span><strong>{heroAction.value}</strong><small>{heroAction.detail}</small></div>
            <div><span>CRITICAL CUT-OFF</span><strong>9/8 · 17:00</strong><small>선전 샘플·정산 마감</small></div>
            <div><span>NEXT MOVEMENT</span><strong>ICN → SZX</strong><small>KE835 · 9/7 08:40</small></div>
            <button type="button" onClick={() => setSelectedDestination(destinations.hotelShenzhen)}><span>DRIVER PASSPORT</span><strong>숙소 주소 준비</strong><small><MapPin size={12} />중문 주소·지도·복사</small></button>
          </div>
          <div className="route-strip" aria-label="여행 경로">
            {[["ICN", "출발"], ["SZX", "선전 2박"], ["YIW", "이우 2박"], ["HGH", "고속철 경유"], ["ICN", "귀국"]].map(([code, label], index) => (
              <div className="route-stop" key={`${code}-${index}`}><b>{code}</b><span>{label}</span></div>
            ))}
          </div>
        </div>
      </section>

      <div className="shell alert-ribbon" aria-label="필수 주의사항">
        <div><AlertTriangle size={17} /><span><b>9/8 선전 정산 마감</b> — 샘플·결제·택배를 17시까지 완료합니다.</span></div>
        <div><Clock3 size={17} /><span><b>9/11 환승 여유 55분</b> — 고속철 지연 시 항공사 연락을 우선합니다.</span></div>
        <div><Plane size={17} /><span><b>원주행 막차 20:10</b> — 인천 T2 버스를 사전 예매합니다.</span></div>
      </div>

      <div className="shell workspace">
        <aside className={`side-rail ${mobileOpen ? "is-open" : ""}`}>
          <div className="rail-intro">
            <span>TRIP CONTROL</span>
            <strong>현장수첩</strong>
            <p>이동 중에도 필요한 정보만 조용히 꺼내 볼 수 있도록 재구성했습니다.</p>
          </div>
          <nav className="section-nav" aria-label="현장수첩 섹션">
            {[
              ["days", CalendarDays, "일정", "Day 1–5"],
              ["places", Map, "조사처", "선전 · 이우"],
              ["consultations", FolderKanban, "상담기록", `${consultationCompleted}/${consultationItems.length} 완료`],
              ["checklist", ClipboardCheck, "체크리스트", `${completed}/${checkTotal.length} 완료`],
              ["rest", Utensils, "식사 · 휴식", "현장 체력 관리"],
              ["bookings", BookOpen, "예약 · 연락처", "확정 정보"],
              ["expenses", ReceiptText, "정산서", `${(expensesQuery.data ?? []).length}건 기록`],
            ].map(([id, Icon, label, detail]) => (
              <button className={area === id ? "active" : ""} onClick={() => navigate(id as Area)} key={id as string} type="button">
                <Icon size={18} /><span><b>{label as string}</b><small>{detail as string}</small></span><ChevronRight size={15} />
              </button>
            ))}
          </nav>
          <div className="rail-status">
            <span>CHECK STATUS</span>
            <strong>{progress}%</strong>
            <div><i style={{ width: `${progress}%` }} /></div>
            <small>체크 상태는 이 기기에 저장됩니다.</small>
          </div>
        </aside>

        <main className="content-sheet">
          {area === "days" && (
            <section className="content-view" aria-labelledby="schedule-heading">
              <div className="day-selector" role="tablist" aria-label="일자 선택">
                {days.map((day) => (
                  <button key={day.id} className={activeDay === day.id ? "selected" : ""} onClick={() => setActiveDay(day.id)} type="button" role="tab" aria-selected={activeDay === day.id}>
                    <span>{day.index}</span><b>{day.date.replace(" · ", "\n")}</b><small>{day.city}</small>
                  </button>
                ))}
              </div>

              <div className="view-heading schedule-heading">
                <div>
                  <span className="section-kicker">DAY {currentDay.index} · {currentDay.city.toUpperCase()}</span>
                  <h2 id="schedule-heading">{currentDay.headline}</h2>
                  <p>{currentDay.objective}</p>
                </div>
                <div className="focus-stamp"><span>오늘의 중점</span><b>{currentDay.focus}</b></div>
              </div>

              <div className="timeline" aria-label={`${currentDay.date} 일정`}>
                {currentDay.events.map((event, index) => (
                  <article className={`timeline-row tone-${event.tone ?? "move"}`} key={`${event.time}-${index}`}>
                    <time><span className="time-state">{event.tone === "meeting" ? "MEET" : event.tone === "finish" ? "CUT-OFF" : event.tone === "focus" ? "FIELD" : "MOVE"}</span>{event.time.split("\n").map((line) => <span key={line}>{line}</span>)}</time>
                    <div className="timeline-dot"><i /></div>
                    <div className="timeline-copy">
                      <div className="event-title"><h3>{event.title}</h3>{event.tone === "meeting" && <span>APPOINTMENT</span>}{event.tone === "finish" && <span>DEADLINE</span>}</div>
                      <p>{event.detail}</p>
                      {event.destination && <button className="address-passport" type="button" onClick={() => setSelectedDestination(destinations[event.destination!])}><span><MapPin size={13} />DRIVER PASSPORT</span><strong>{destinations[event.destination].chinese}</strong><small>{destinations[event.destination].name}<em>주소·지도·복사 <ArrowUpRight size={13} /></em></small></button>}
                    </div>
                  </article>
                ))}
              </div>

              <div className="day-footnotes">
                <div><Info size={19} /><p><b>현장 기준</b> — 최초 제시가를 즉시 수락하지 않습니다. 동일 품목은 최소 3개 부스에서 교차 견적한 뒤 품질·인증·납기를 함께 비교합니다.</p></div>
                <div><BriefcaseBusiness size={19} /><p><b>기록 원칙</b> — 샘플마다 업체명·부스번호·단가를 라벨링하고, 부스 전경과 명함을 함께 촬영합니다.</p></div>
              </div>
            </section>
          )}

          {area === "places" && (
            <section className="content-view" aria-labelledby="places-heading">
              <div className="view-heading"><div><span className="section-kicker">FIELD MAP</span><h2 id="places-heading">조사처를 <i>행동 단위</i>로 정리합니다.</h2><p>주소는 택시 기사에게 그대로 보여주고, 지도·복사 기능은 현장에서 바로 사용합니다.</p></div></div>
              <div className="place-sections">
                {researchSections.map((section) => (
                  <section className="place-section" key={section.label}>
                    <div className="place-section-head">
                      <img src={section.image} alt={section.imageAlt} />
                      <div><span>RESEARCH AREA</span><h3>{section.label}</h3><p>중문 주소와 조사 요령을 함께 확인합니다.</p></div>
                    </div>
                    <div className="place-grid">
                      {section.cards.map(([name, tag, description, destination]) => (
                        <article className="place-card" key={name}>
                          <div><span>{tag}</span><h4>{name}</h4></div>
                          <p>{description}</p>
                          <button type="button" onClick={() => setSelectedDestination(destinations[destination as keyof typeof destinations])}><MapPin size={15} />주소·지도</button>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <div className="method-note"><MapPin size={20} /><p><b>이우 현장 팁.</b> yiwugo.com에서 품목과 층을 검색해 부스 번호를 찾은 뒤, 중국어 주소를 Amap에 저장합니다. 상무성은 09:00 개장·17:00 폐장이고 11:30–12:30에는 자리를 비우는 점포가 많습니다.</p></div>
            </section>
          )}

          {area === "consultations" && (
            <section className="content-view" aria-labelledby="consultation-heading">
              <div className="view-heading checklist-heading"><div><span className="section-kicker">VENDOR CONVERSATIONS</span><h2 id="consultation-heading">업체별 <i>상담 기록</i>을 남깁니다.</h2><p>조사처에서 만난 업체를 폴더로 추가한 뒤, 각 업체의 담당자·부스·상담 내용·현장 사진을 독립적으로 보관합니다.</p></div><div className="consultation-actions"><button className="export-records" type="button" onClick={() => void handleExportRecords()} disabled={exportRecordsMutation.isPending}><FileSpreadsheet size={14} />{exportRecordsMutation.isPending ? "엑셀 생성 중" : "업체별 엑셀"}</button><div className="progress-seal"><strong>{consultationCompleted}<small> / {consultationItems.length}</small></strong><span>선택 업체 완료</span></div></div></div>
              {!authLoading && !isAuthenticated && <div className="record-login-banner"><div><LogIn size={20} /><span><b>상담 기록과 사진을 저장하려면 로그인하세요.</b><small>저장된 내용은 같은 계정으로 어느 기기에서나 다시 확인할 수 있습니다.</small></span></div><button type="button" onClick={requestLogin} disabled={isStartingLogin}>{isStartingLogin ? <><LoaderCircle size={13} className="spin" />연결 중</> : "로그인"}</button></div>}
              <div className="vendor-workspace">
                <aside className="vendor-folder-panel"><div className="vendor-folder-head"><span>업체 폴더</span><small>{(vendorsQuery.data ?? []).length}개</small></div><div className="vendor-folder-list">{(vendorsQuery.data ?? []).map((vendor) => <button type="button" className={selectedVendor?.id === vendor.id ? "active" : ""} key={vendor.id} onClick={() => selectVendor(vendor)}><b>{vendor.name}</b><small>{vendor.contactName || vendor.booth || "상담 기록 열기"}</small></button>)}</div><button className="new-vendor-button" type="button" onClick={() => { setSelectedVendorId(null); setVendorDraft({ id: undefined, name: "", contactName: "", booth: "" }); }}>+ 새 업체 폴더</button><div className="vendor-form"><span>VENDOR FOLDER</span><input value={vendorDraft.name} onChange={(event) => setVendorDraft((current) => ({ ...current, name: event.target.value }))} placeholder="업체명 *" maxLength={160} /><input value={vendorDraft.contactName} onChange={(event) => setVendorDraft((current) => ({ ...current, contactName: event.target.value }))} placeholder="담당자" maxLength={120} /><input value={vendorDraft.booth} onChange={(event) => setVendorDraft((current) => ({ ...current, booth: event.target.value }))} placeholder="부스 번호" maxLength={120} /><button type="button" onClick={() => void saveVendor()} disabled={savingVendor}>{savingVendor ? "저장 중" : vendorDraft.id ? "업체 정보 저장" : "업체 폴더 추가"}</button>{selectedVendor && <button className="delete-vendor-button" type="button" onClick={() => void deleteSelectedVendor()}>선택 업체 삭제</button>}</div></aside>
                <div className="vendor-records-panel">{selectedVendor ? <><div className="vendor-record-title"><span>SELECTED VENDOR</span><h3>{selectedVendor.name}</h3><p>{[selectedVendor.contactName, selectedVendor.booth].filter(Boolean).join(" · ") || "담당자와 부스 정보를 입력해 주세요."}</p></div><div className="check-groups"><section className="check-group"><div className="record-form-head"><span>상담 항목</span><span>이 업체의 현장 메모</span></div>{consultationItems.map((item, index) => {
                  const id = `record-${index}`; const value = getVendorRecordValue(selectedVendor.id, id); const saved = selectedVendor.consultations.find((record) => record.recordKey === id);
                  return <div className={`record-form-row ${value.isChecked ? "done" : ""}`} key={id}><label className="record-item-label"><input type="checkbox" checked={value.isChecked} onChange={() => updateVendorRecordDraft(selectedVendor.id, id, { isChecked: !value.isChecked })} /><span className="box"><Check size={14} /></span><span>{item}</span></label><div className="record-note-field"><div className="record-note-meta"><span>FIELD NOTE</span><div><small>{saved ? "이 업체 폴더에 저장됨" : "저장 전"}</small><button type="button" onClick={() => void saveVendorConsultation(selectedVendor.id, id, item)} disabled={savingVendorRecordKey === id || uploadingVendorRecordKey === id}>{savingVendorRecordKey === id ? <LoaderCircle size={13} className="spin" /> : <Save size={13} />}{savingVendorRecordKey === id ? "저장 중" : "저장"}</button></div></div><textarea value={value.note} onChange={(event) => updateVendorRecordDraft(selectedVendor.id, id, { note: event.target.value })} onBlur={() => void saveVendorConsultation(selectedVendor.id, id, item)} placeholder="담당자 답변, MOQ, 단가, 후속 행동을 적으세요." rows={3} /><div className="record-photo-area"><label className={uploadingVendorRecordKey === id ? "photo-upload is-uploading" : "photo-upload"}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void uploadVendorConsultationPhoto(selectedVendor.id, id, item, file); }} /><span>{uploadingVendorRecordKey === id ? <LoaderCircle size={14} className="spin" /> : <ImagePlus size={14} />}{uploadingVendorRecordKey === id ? "사진 업로드 중" : "이 업체 사진 첨부"}</span></label>{saved?.photos?.length ? <div className="photo-grid">{saved.photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={`${selectedVendor.name} ${item} 첨부 사진`} /><button type="button" onClick={() => void (async () => { await deleteVendorPhotoMutation.mutateAsync({ photoId: photo.id }); await utils.vendors.list.invalidate(); })()} aria-label={`${photo.fileName} 삭제`}><Trash2 size={13} /></button><figcaption><span>{photo.fileName}</span><input className="photo-caption-input" value={vendorPhotoCaptionDrafts[photo.id] ?? photo.caption} onChange={(event) => setVendorPhotoCaptionDrafts((current) => ({ ...current, [photo.id]: event.target.value }))} onBlur={(event) => void saveVendorPhotoCaption(photo.id, event.target.value)} placeholder="사진 캡션" maxLength={500} /></figcaption></figure>)}</div> : null}</div></div></div>;
                })}</section></div></> : <div className="vendor-empty"><FolderKanban size={28} /><h3>첫 업체 폴더를 추가하세요.</h3><p>업체명, 담당자, 부스 번호를 입력하면 업체별 상담 기록과 사진이 서로 섞이지 않고 보관됩니다.</p></div>}</div>
              </div>
            </section>
          )}

          {area === "checklist" && (
            <section className="content-view" aria-labelledby="checklist-heading">
              <div className="view-heading checklist-heading"><div><span className="section-kicker">PRE-TRIP CONTROL</span><h2 id="checklist-heading">출발 전 <i>준비와 증빙</i>을 확인합니다.</h2><p>준비 상태, 예약 진행 메모와 확인서·보험증·QR 캡처를 항목별로 저장합니다.</p></div><div className="progress-seal"><strong>{completed}<small> / {checkTotal.length}</small></strong><span>준비 완료</span></div></div>
              <div className="progress-line"><i style={{ width: `${progress}%` }} /><span>{progress}% COMPLETE</span></div>
              {!authLoading && !isAuthenticated && <div className="record-login-banner"><div><LogIn size={20} /><span><b>준비 체크와 증빙을 저장하려면 로그인하세요.</b><small>사진·PDF 확인서를 안전하게 계정에 보관합니다.</small></span></div><button type="button" onClick={requestLogin} disabled={isStartingLogin}>{isStartingLogin ? <><LoaderCircle size={13} className="spin" />연결 중</> : "로그인"}</button></div>}
              <div className="check-groups">{checklistGroups.map((group) => <section className="check-group" key={group.id}><div className="check-group-head"><span>{group.label}</span><small>{group.items.filter((_, index) => getChecklistValue(`${group.id}-${index}`).isChecked).length} / {group.items.length}</small></div>{group.items.map((item, index) => {
                const itemKey = `${group.id}-${index}`; const value = getChecklistValue(itemKey); const saved = storedChecklist[itemKey];
                return <article className={`prep-item ${value.isChecked ? "done" : ""}`} key={itemKey}><label><input type="checkbox" checked={value.isChecked} onChange={() => updateChecklistDraft(itemKey, { isChecked: !value.isChecked })} /><span className="box"><Check size={14} /></span><b>{item}</b></label><div className="prep-item-body"><div className="record-note-meta"><span>PRE-TRIP NOTE</span><button type="button" onClick={() => void saveChecklist(itemKey, group.id, item)} disabled={savingChecklistKey === itemKey}>{savingChecklistKey === itemKey ? <LoaderCircle size={13} className="spin" /> : <Save size={13} />}{savingChecklistKey === itemKey ? "저장 중" : "저장"}</button></div><textarea value={value.note} onChange={(event) => updateChecklistDraft(itemKey, { note: event.target.value })} onBlur={() => void saveChecklist(itemKey, group.id, item)} placeholder="예약 진행 상태, 확인번호, 준비 메모를 기록하세요." rows={2} /><div className="proof-row"><label className={uploadingChecklistKey === itemKey ? "photo-upload is-uploading" : "photo-upload"}><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void handleChecklistEvidenceUpload(itemKey, group.id, item, file); }} /><span>{uploadingChecklistKey === itemKey ? <LoaderCircle size={14} className="spin" /> : <FileSpreadsheet size={14} />}{uploadingChecklistKey === itemKey ? "파일 업로드 중" : "증빙 사진·PDF 업로드"}</span></label>{saved?.evidence?.map((file) => <a className="proof-file" href={file.url} target="_blank" rel="noreferrer" key={file.id}><FileSpreadsheet size={13} /><span>{file.fileName}</span><button type="button" onClick={(event) => { event.preventDefault(); void deleteChecklistEvidence(file.id); }} aria-label={`${file.fileName} 삭제`}><Trash2 size={12} /></button></a>)}</div></div></article>;
              })}</section>)}</div>
            </section>
          )}

          {area === "rest" && (
            <section className="content-view" aria-labelledby="rest-heading">
              <div className="view-heading"><div><span className="section-kicker">RECOVERY & LANGUAGE</span><h2 id="rest-heading">동선 안에서 <i>회복</i>합니다.</h2><p>하루 1만 5천 보 이상을 걷는 일정입니다. 혼자 가도 빠르고 편한 선택지만 남겼습니다.</p></div></div>
              <div className="recovery-grid">
                <article className="recovery-card primary"><span>SHENZHEN</span><h3>화창베이<br />도보권 식사</h3><p><b>윈웨이관</b>은 15분 내로 마치기 좋은 윈난 쌀국수, <b>판러우</b>는 9/8 마감 후 들르기 좋은 광둥 딤섬입니다.</p><button type="button" onClick={() => setSelectedDestination(destinations.fanlou)}>판러우 주소 열기 <ArrowUpRight size={15} /></button></article>
                <article className="recovery-card"><span>YIWU</span><h3>영어 메뉴가<br />있는 저녁</h3><p>Sofia Italian, Bosphorus 등은 외국 상인이 많은 이우에서 주문 부담이 적은 선택지입니다.</p><button type="button" onClick={() => setSelectedDestination(destinations.sofia)}>Sofia 주소 열기 <ArrowUpRight size={15} /></button></article>
                <article className="recovery-card note-card"><Utensils size={22} /><h3>QR 주문 4단계</h3><ol><li>대중점평에서 메뉴 사진을 미리 캡처</li><li>「一个人」으로 1인임을 알림</li><li>QR 화면을 캡처해 이미지 번역</li><li>매운맛은 「不要辣」, 소량은 「要小份」</li></ol></article>
              </div>
              <section className="phrase-sheet"><div><span>QUICK PHRASES</span><h3>현장 중국어</h3></div><div className="phrase-grid">{[["최소 주문 수량이 얼마예요?", "起订量是多少？"], ["우리 로고 인쇄 가능해요?", "可以印我们的logo吗？"], ["견적서 주세요", "请给我报价单"], ["위챗 추가해도 될까요?", "可以加个微信吗？"], ["샘플 하나 살 수 있어요?", "可以买一个样品吗？"], ["포장해 주세요", "打包"]].map(([ko, zh]) => <div key={ko}><span>{ko}</span><b>{zh}</b></div>)}</div></section>
              <div className="safety-note"><AlertTriangle size={20} /><p><b>체력과 안전.</b> 낮에는 덥고 습하며 실내 냉방은 강합니다. 얇은 겉옷·운동화·생수를 준비하고, 마사지 업소는 호텔 프런트의 「正规足疗店」 추천이나 평점 4.3 이상 체인점만 이용합니다.</p></div>
            </section>
          )}

          {area === "bookings" && (
            <section className="content-view" aria-labelledby="bookings-heading">
              <div className="view-heading"><div><span className="section-kicker">CONFIRMED RECORDS</span><h2 id="bookings-heading">예약과 연락처를 <i>한 장</i>에.</h2><p>이동 수단, 숙소, 비상 연락처를 필요한 순간에 바로 찾습니다.</p></div></div>
              <div className="booking-table-wrap"><table className="booking-table"><thead><tr><th>구분</th><th>이동 · 숙소</th><th>일정</th><th>확인번호</th><th>결제액</th></tr></thead><tbody>{bookings.map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}<tr className="total-row"><td>기 결제 소계</td><td colSpan={3}>항공 3건 · 고속철 · 숙박 2건</td><td>1,207,026원</td></tr></tbody></table></div>
              <section className="contact-section"><div className="contact-title"><Phone size={20} /><div><span>EMERGENCY</span><h3>비상 연락처</h3></div></div><div className="contact-grid">{emergency.map(([name, phone, note]) => <article key={name}><span>{name}</span><a href={`tel:${phone.replaceAll("·", "").replaceAll(" ", "")}`}>{phone}</a><small>{note}</small></article>)}</div></section>
              <div className="method-note"><TrainFront size={20} /><p><b>9/11 환승 규칙.</b> 이우역에서 고속철 지연을 확인하는 즉시 아시아나 예약센터에 연락합니다. 항저우동역에서 공항 이동은 택시 전환(약 ¥180, 60분)을 검토하고, 체크인 마감 14:10을 넘기지 않습니다.</p></div>
            </section>
          )}

          {area === "expenses" && (
            <section className="content-view" aria-labelledby="expense-heading">
              <div className="view-heading checklist-heading"><div><span className="section-kicker">TRIP EXPENSE LEDGER</span><h2 id="expense-heading">출장 비용을 <i>항목별로</i> 정리합니다.</h2><p>교통비, 식대, 숙박 등 지출을 기록하고 영수증 사진·PDF를 함께 보관합니다. 통화별 집계는 입력 즉시 갱신됩니다.</p></div><div className="progress-seal"><strong>{(expensesQuery.data ?? []).length}<small> 건</small></strong><span>비용 기록</span></div></div>
              {!authLoading && !isAuthenticated && <div className="record-login-banner"><div><LogIn size={20} /><span><b>정산서와 영수증을 저장하려면 로그인하세요.</b><small>입력한 비용과 영수증은 계정에 보관됩니다.</small></span></div><button type="button" onClick={requestLogin} disabled={isStartingLogin}>{isStartingLogin ? <><LoaderCircle size={13} className="spin" />연결 중</> : "로그인"}</button></div>}
              <div className="expense-summary">{(["KRW", "CNY", "USD"] as const).map((currency) => <div key={currency}><span>{currency}</span><strong>{new Intl.NumberFormat("ko-KR").format(expenseTotals[currency] ?? 0)}</strong><small>{currency === "KRW" ? "원" : currency === "CNY" ? "위안" : "달러"}</small></div>)}</div>
              <section className="expense-editor"><div className="expense-editor-head"><div><span>NEW / EDIT EXPENSE</span><h3>{expenseDraft.id ? "비용 항목 수정" : "새 비용 항목"}</h3></div>{expenseDraft.id && <button type="button" onClick={() => setExpenseDraft(blankExpenseDraft())}>새 항목 작성</button>}</div><div className="expense-category-row">{expenseCategories.map(([key, label]) => <button type="button" className={expenseDraft.category === key ? "active" : ""} onClick={() => setExpenseDraft((current) => ({ ...current, category: key }))} key={key}>{label}</button>)}</div><div className="expense-form-grid"><label><span>비용명</span><input value={expenseDraft.title} onChange={(event) => setExpenseDraft((current) => ({ ...current, title: event.target.value }))} placeholder="예: 선전공항 → 호텔 디디" maxLength={160} /></label><label><span>금액</span><input inputMode="numeric" value={expenseDraft.amount} onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: event.target.value.replace(/[^0-9,]/g, "") }))} placeholder="0" /></label><label><span>통화</span><select value={expenseDraft.currency} onChange={(event) => setExpenseDraft((current) => ({ ...current, currency: event.target.value as ExpenseDraft["currency"] }))}><option value="KRW">KRW · 원</option><option value="CNY">CNY · 위안</option><option value="USD">USD · 달러</option></select></label><label><span>지출일</span><input type="date" value={expenseDraft.spentAt} onChange={(event) => setExpenseDraft((current) => ({ ...current, spentAt: event.target.value }))} /></label></div><label className="expense-note"><span>상세 메모</span><textarea value={expenseDraft.note} onChange={(event) => setExpenseDraft((current) => ({ ...current, note: event.target.value }))} placeholder="결제 수단, 동행자, 정산 메모를 적으세요." rows={3} /></label><div className="expense-actions"><button className="expense-save" type="button" onClick={() => void saveExpense()} disabled={savingExpense}>{savingExpense ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}{savingExpense ? "저장 중" : "비용 저장"}</button><label className={uploadingReceipt ? "photo-upload is-uploading" : "photo-upload"}><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void handleReceiptUpload(file); }} /><span>{uploadingReceipt ? <LoaderCircle size={14} className="spin" /> : <FileSpreadsheet size={14} />}{uploadingReceipt ? "영수증 업로드 중" : "영수증 사진·PDF 첨부"}</span></label></div></section>
              <section className="expense-list"><div className="check-group-head"><span>입력된 비용</span><small>{(expensesQuery.data ?? []).length}건</small></div>{(expensesQuery.data ?? []).length ? (expensesQuery.data ?? []).map((expense) => <article className="expense-row" key={expense.id}><div className="expense-row-main"><span>{expenseCategories.find(([key]) => key === expense.category)?.[1] ?? "기타"}</span><div><h3>{expense.title}</h3><p>{new Date(expense.spentAt).toLocaleDateString("ko-KR")} · {expense.note || "메모 없음"}</p></div><strong>{expense.currency} {new Intl.NumberFormat("ko-KR").format(expense.amount)}</strong></div><div className="receipt-list">{expense.receipts.map((receipt) => <span key={receipt.id}><a href={receipt.url} target="_blank" rel="noreferrer"><FileSpreadsheet size={13} />{receipt.fileName}</a><button type="button" onClick={() => void (async () => { try { await deleteReceiptMutation.mutateAsync({ receiptId: receipt.id }); await utils.expenses.list.invalidate(); setToast("영수증을 삭제했습니다."); } catch { setToast("영수증을 삭제하지 못했습니다."); } })()} aria-label={`${receipt.fileName} 삭제`}><Trash2 size={12} /></button></span>)}</div><div className="expense-row-actions"><button type="button" onClick={() => setExpenseDraft({ id: expense.id, category: expense.category, title: expense.title, amount: String(expense.amount), currency: expense.currency as ExpenseDraft["currency"], spentAt: new Date(expense.spentAt).toISOString().slice(0, 10), note: expense.note })}>수정</button><button type="button" onClick={() => void (async () => { try { await deleteExpenseMutation.mutateAsync({ expenseId: expense.id }); await utils.expenses.list.invalidate(); if (expenseDraft.id === expense.id) setExpenseDraft(blankExpenseDraft()); setToast("비용 항목을 삭제했습니다."); } catch { setToast("비용 항목을 삭제하지 못했습니다."); } })()}>삭제</button></div></article>) : <div className="expense-empty"><ReceiptText size={24} /><p>아직 기록한 비용이 없습니다. 위에서 카테고리와 금액을 선택해 첫 정산 항목을 추가하세요.</p></div>}</section>
            </section>
          )}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="모바일 바로가기">
        <button className={area === "days" ? "active" : ""} type="button" onClick={() => navigate("days")}><CalendarDays size={18} /><span>일정</span></button>
        <button className={area === "places" ? "active" : ""} type="button" onClick={() => navigate("places")}><Map size={18} /><span>조사처</span></button>
        <button className={area === "consultations" ? "active" : ""} type="button" onClick={() => navigate("consultations")}><FolderKanban size={18} /><span>상담</span></button>
        <button className={area === "checklist" ? "active" : ""} type="button" onClick={() => navigate("checklist")}><ClipboardCheck size={18} /><span>체크</span></button>
        <button className={area === "bookings" ? "active" : ""} type="button" onClick={() => navigate("bookings")}><BookOpen size={18} /><span>예약</span></button>
        <button className={area === "expenses" ? "active" : ""} type="button" onClick={() => navigate("expenses")}><ReceiptText size={18} /><span>정산</span></button>
      </nav>

      {selectedDestination && <DestinationModal destination={selectedDestination} onClose={() => setSelectedDestination(null)} onCopy={handleCopy} />}
      {(isStartingLogin || exportRecordsMutation.isPending) && <div className="activity-overlay" role="status" aria-live="polite" aria-busy="true"><div className="activity-card"><LoaderCircle size={30} className="spin" /><span>{isStartingLogin ? "LOGIN CONNECTION" : "FIELD EXPORT"}</span><strong>{isStartingLogin ? "보안 로그인 연결을 준비하고 있습니다." : "업체별 상담기록을 엑셀 파일로 정리하고 있습니다."}</strong><small>{isStartingLogin ? "잠시 후 인증 화면으로 이동합니다." : "사진 썸네일과 캡션을 함께 포함합니다."}</small></div></div>}
      {loginSetupError && <div className="service-notice-overlay" role="dialog" aria-modal="true" aria-labelledby="login-setup-title"><section className="service-notice"><button className="close-modal" type="button" onClick={() => setLoginSetupError("")} aria-label="안내 닫기"><X size={17} /></button><AlertTriangle size={23} /><span>LOGIN SETUP REQUIRED</span><h2 id="login-setup-title">로그인 설정이 필요합니다.</h2><p>{loginSetupError}</p><p>Netlify의 <b>Site configuration → Environment variables</b>에서 두 공개 값을 입력하고 다시 배포해 주세요.</p><button className="notice-primary" type="button" onClick={() => setLoginSetupError("")}>확인</button></section></div>}
      {apiProxyIssue && <div className="service-notice-overlay" role="dialog" aria-modal="true" aria-labelledby="proxy-issue-title"><section className="service-notice"><button className="close-modal" type="button" onClick={() => setApiProxyIssue(null)} aria-label="안내 닫기"><X size={17} /></button><AlertTriangle size={23} /><span>API CONNECTION CHECK</span><h2 id="proxy-issue-title">서비스 연결을 확인해 주세요.</h2><p>저장·로그인·내보내기를 처리하는 API에 연결하지 못했습니다. Netlify 프록시와 기존 백엔드 상태를 확인한 뒤 다시 시도해 주세요.</p><p>{apiProxyIssue.status ? `연결 상태 코드: ${apiProxyIssue.status}` : "네트워크 연결 또는 프록시 응답을 확인해 주세요."}</p><div className="notice-actions"><button type="button" onClick={() => setApiProxyIssue(null)}>닫기</button><button className="notice-primary" type="button" onClick={() => window.location.reload()}>새로고침</button></div></section></div>}
      {toast && <div className="toast" role="status"><CircleCheck size={17} />{toast}</div>}
    </div>
  );
}

function DestinationModal({ destination, onClose, onCopy }: { destination: Destination; onClose: () => void; onCopy: () => void }) {
  const maps = getMapUrls(destination);
  return <div className="destination-overlay" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
    <section className="destination-modal" role="dialog" aria-modal="true" aria-label={`${destination.name} 주소`}>
      <button className="close-modal" type="button" onClick={onClose} aria-label="주소 창 닫기"><X size={20} /></button>
      <span className="modal-kicker">DRIVER PASSPORT</span>
      <h2>기사에게 이 화면을<br />그대로 보여주세요.</h2>
      <div className="address-panel"><span>CHINESE ADDRESS</span><strong>{destination.chinese}</strong><p>{destination.name}<br />{destination.address}</p></div>
      {destination.note && <p className="modal-note">{destination.note}</p>}
      <div className="modal-actions"><button type="button" onClick={onCopy}><Copy size={17} />주소 복사</button><a href={maps.amap} target="_blank" rel="noreferrer"><Navigation size={17} />高德지도</a><a href={maps.google} target="_blank" rel="noreferrer"><ExternalLink size={17} />구글지도</a></div>
      <small>중국에서는 高德지도를 우선 사용합니다. 구글지도는 로밍 상태에서 확인하십시오.</small>
    </section>
  </div>;
}
