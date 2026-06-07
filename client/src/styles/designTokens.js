// SRM Dental Clinic — locked Tailwind design tokens (reference: PatientDashboard)

export const PAGE_BG =
  "min-h-screen flex justify-center items-start p-6 md:p-10 bg-gradient-to-br from-[rgba(37,40,107,0.5)] to-[rgba(37,40,107,0.5)] bg-[url('/images/campus.png')] bg-cover bg-center";

export const PAGE_BG_CENTERED =
  "min-h-screen flex justify-center items-center p-6 md:p-10 bg-gradient-to-br from-[rgba(37,40,107,0.5)] to-[rgba(37,40,107,0.5)] bg-[url('/images/campus.png')] bg-cover bg-center";

export const GLASS_CARD =
  "bg-[rgba(37,40,106,0.95)] backdrop-blur-[15px] border border-[rgba(255,255,255,0.1)] rounded-3xl p-8 md:p-10 text-white shadow-[0_25px_50px_rgba(0,0,0,0.4)]";

export const GLASS_CARD_SM =
  "bg-[rgba(37,40,106,0.95)] backdrop-blur-[15px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 text-white shadow-[0_8px_20px_rgba(0,0,0,0.3)]";

export const WHITE_CARD =
  "bg-white rounded-xl shadow-md p-6 border border-gray-200 transition-all";

export const WHITE_CARD_HOVER =
  "bg-white rounded-xl shadow-md p-6 border border-gray-200 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer";

export const PAGE_TITLE =
  "text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent";

export const SECTION_TITLE = "text-xl md:text-2xl font-bold text-white mb-4";

export const CARD_TITLE = "text-lg font-semibold text-gray-800";

export const BODY_TEXT = "text-sm md:text-base text-white/90";

export const MUTED_TEXT = "text-sm text-gray-500";

export const LABEL_DARK = "block text-sm font-semibold mb-2 text-gray-200";

export const LABEL_LIGHT = "block text-sm font-semibold mb-2 text-gray-700";

export const ERROR_TEXT = "mt-1 text-sm text-red-600";

export const ERROR_TEXT_DARK = "mt-1 text-sm text-red-400";

export const BTN_PRIMARY =
  "px-4 py-2 rounded-lg bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white text-sm font-bold hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 transition-all hover:shadow-[0_10px_30px_rgba(60,141,255,0.5)] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_PRIMARY_LG =
  "w-full px-6 py-3 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white text-base font-bold hover:from-blue-700 hover:via-blue-600 hover:to-blue-500 transition-all hover:shadow-[0_10px_30px_rgba(60,141,255,0.5)] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_SECONDARY =
  "px-4 py-2 rounded-lg bg-white/15 border-2 border-white/20 text-white text-sm font-semibold hover:bg-white/25 hover:border-white/30 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_SUCCESS =
  "px-4 py-2 rounded-lg bg-gradient-to-br from-green-600 to-green-700 text-white text-sm font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-green-500/15 disabled:opacity-60 disabled:cursor-not-allowed";

export const BTN_DANGER =
  "px-4 py-2 rounded-lg bg-gradient-to-br from-red-600 to-red-700 text-white text-sm font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:shadow-[0_8px_25px_rgba(239,68,68,0.4)] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-red-500/15 disabled:opacity-60 disabled:cursor-not-allowed";

export const INPUT =
  "w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed";

export const INPUT_DARK =
  "w-full px-4 py-3 border-2 border-[rgba(255,255,255,0.1)] rounded-xl bg-[rgba(255,255,255,0.95)] text-gray-800 text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed";

export const SELECT = INPUT + " appearance-none cursor-pointer";

export const SELECT_DARK = INPUT_DARK + " appearance-none cursor-pointer";

export const TEXTAREA = INPUT + " resize-y leading-relaxed";

export const TEXTAREA_DARK = INPUT_DARK + " resize-y leading-relaxed";

export const TABLE_WRAPPER = "w-full overflow-x-auto";

export const TABLE = "w-full border-collapse min-w-[640px]";

export const TABLE_HEAD_ROW = "bg-transparent";

export const TABLE_HEAD_CELL =
  "px-3 py-3 border-b border-[rgba(255,255,255,0.12)] text-left font-bold text-sm text-[rgba(255,255,255,0.95)] whitespace-nowrap";

export const TABLE_HEAD_CELL_LIGHT =
  "px-3 py-3 border-b border-gray-200 text-left font-bold text-sm text-gray-700 whitespace-nowrap bg-gray-50";

export const TABLE_BODY_ROW = "transition-colors hover:bg-[rgba(255,255,255,0.04)]";

export const TABLE_BODY_ROW_ALT = "transition-colors hover:bg-gray-50 even:bg-gray-50/50";

export const TABLE_BODY_CELL =
  "px-3 py-3 border-b border-[rgba(255,255,255,0.12)] text-sm text-[rgba(255,255,255,0.96)] align-middle";

export const TABLE_BODY_CELL_LIGHT =
  "px-3 py-3 border-b border-gray-200 text-sm text-gray-800 align-middle";

export const BADGE_BASE =
  "inline-flex items-center justify-center px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap";

export const BADGE_PENDING =
  BADGE_BASE + " bg-[rgba(245,158,11,0.16)] text-[#fde68a] border border-[rgba(245,158,11,0.35)]";

export const BADGE_CONFIRMED =
  BADGE_BASE + " bg-[rgba(34,197,94,0.16)] text-[#d1fae5] border border-[rgba(34,197,94,0.35)]";

export const BADGE_COMPLETED =
  BADGE_BASE + " bg-[rgba(34,197,94,0.16)] text-[#d1fae5] border border-[rgba(34,197,94,0.35)]";

export const BADGE_RESCHEDULED =
  BADGE_BASE + " bg-[rgba(59,130,246,0.16)] text-[#bfdbfe] border border-[rgba(59,130,246,0.35)]";

export const BADGE_CANCELLED =
  BADGE_BASE + " bg-[rgba(239,68,68,0.16)] text-[#fecaca] border border-[rgba(239,68,68,0.35)]";

export const BADGE_COMING_SOON =
  "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-500 text-white";

export const MODAL_OVERLAY =
  "fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[100] p-4";

export const MODAL_PANEL =
  "bg-[rgba(37,40,106,0.98)] backdrop-blur-[20px] rounded-2xl w-full max-w-lg mx-auto text-white shadow-[0_25px_50px_rgba(0,0,0,0.5)] border-2 border-[rgba(255,255,255,0.15)] max-h-[90vh] overflow-y-auto";

export const LOADING_BOX =
  "bg-[rgba(114,196,255,0.15)] border-2 border-[rgba(114,196,255,0.3)] rounded-xl p-6 text-center backdrop-blur-sm";
