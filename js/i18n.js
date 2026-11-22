// Arabic (right to left) and English text. The choice is kept in this browser.
const LANG_KEY = 'home-finance-lang';

function readLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    // Storage blocked: fall back to the browser language.
  }
  return (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'ar';
}

export const lang = readLang();
export const isAr = lang === 'ar';
document.documentElement.lang = lang;
document.documentElement.dir = isAr ? 'rtl' : 'ltr';

export function setLang(next) {
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    // Storage blocked: the choice lasts until the page is closed.
  }
  location.reload();
}

const S = {
  // shell
  app_name: ['المساعد المالي المنزلي', 'Home Finance'],
  nav_home: ['الملخص', 'Home'],
  nav_add: ['إضافة', 'Add'],
  nav_history: ['السجل', 'History'],
  nav_categories: ['البنود', 'Budgets'],
  nav_settings: ['الإعدادات', 'Settings'],
  loading: ['جارٍ التحميل…', 'Loading…'],
  could_not_connect: ['تعذّر الاتصال: {msg}', 'Could not connect: {msg}'],
  went_wrong: ['حدث خطأ: {msg}', 'Something went wrong: {msg}'],
  not_found: ['الصفحة غير موجودة.', 'Page not found.'],
  go_home: ['العودة للملخص', 'Go to the dashboard'],
  demo_banner: [
    'وضع التجربة: بيانات تجريبية محفوظة في هذا المتصفح فقط. اربط Supabase لمشاركة الميزانية مع أسرتك.',
    'Demo mode: sample data, saved only in this browser. Connect Supabase to share with your family.',
  ],
  demo_reset: ['استرجاع البيانات التجريبية', 'Reset sample data'],
  demo_restored: ['تم استرجاع البيانات التجريبية', 'Sample data restored'],
  sign_out: ['تسجيل الخروج', 'Sign out'],
  cancel: ['إلغاء', 'Cancel'],
  save: ['حفظ', 'Save'],
  delete: ['حذف', 'Delete'],
  edit: ['تعديل', 'Edit'],
  ok: ['تم', 'OK'],
  back: ['رجوع', 'Back'],

  // login
  sign_in: ['تسجيل الدخول', 'Sign in'],
  create_account: ['إنشاء حساب', 'Create account'],
  reset_password: ['استعادة كلمة المرور', 'Reset password'],
  send_reset: ['إرسال رابط الاستعادة', 'Send reset link'],
  your_name: ['اسمك', 'Your name'],
  email: ['البريد الإلكتروني', 'Email'],
  password: ['كلمة المرور', 'Password'],
  new_here: ['جديد هنا؟ ', 'New here? '],
  have_account: ['لديك حساب؟ ', 'Already have an account? '],
  forgot: ['نسيت كلمة المرور؟', 'Forgot your password?'],
  back_to_sign_in: ['العودة لتسجيل الدخول', 'Back to sign in'],
  reset_sent: [
    'إذا كان لهذا البريد حساب، فسيصلك رابط لتعيين كلمة مرور جديدة.',
    'If this email has an account, a link to set a new password is on its way.',
  ],
  confirm_email: [
    'افتح رسالة التأكيد في بريدك، ثم سجّل الدخول هنا.',
    'Check your email and open the confirmation link, then sign in here.',
  ],
  invited: [
    'تمت دعوتك إلى ميزانية بيت. سجّل الدخول أو أنشئ حسابًا للانضمام.',
    'You have been invited to a household. Sign in or create an account to join it.',
  ],
  new_password_title: ['اختر كلمة مرور جديدة', 'Choose a new password'],
  new_password: ['كلمة المرور الجديدة', 'New password'],
  save_password: ['حفظ كلمة المرور', 'Save password'],
  password_changed: ['تم تغيير كلمة المرور', 'Password changed'],

  // households
  welcome: ['أهلاً بك', 'Welcome'],
  welcome_text: [
    'انضم إلى ميزانية البيت التي دُعيت إليها، أو ابدأ ميزانية جديدة وادعُ أسرتك.',
    'Join the household you were invited to, or start your own and invite your family.',
  ],
  waiting: ['في انتظار الموافقة', 'Waiting for approval'],
  waiting_text: [
    'تم إرسال طلب الانضمام إلى {name}. يجب أن يوافق مسؤول البيت قبل أن ترى المصروفات.',
    'Your request to join {name} has been sent. An admin there needs to approve you before you can see the expenses.',
  ],
  check_again: ['تحقق مرة أخرى', 'Check again'],
  households: ['البيوت', 'Households'],
  open_now: ['مفتوح الآن', 'Open now'],
  open: ['فتح', 'Open'],
  leave: ['مغادرة', 'Leave'],
  cancel_request: ['إلغاء الطلب', 'Cancel request'],
  join_title: ['الانضمام إلى بيت', 'Join a household'],
  join_hint: ['اطلب رمز الانضمام أو رابط الدعوة من مسؤول البيت.', "Ask the household's admin for the join code or invite link."],
  join_code: ['رمز الانضمام', 'Join code'],
  ask_to_join: ['طلب الانضمام', 'Ask to join'],
  start_title: ['بدء ميزانية بيت جديدة', 'Start a new household'],
  start_hint: [
    'ستكون مسؤول البيت ويمكنك دعوة أسرتك. تبدأ بعشرة بنود ميزانية جاهزة يمكنك تعديلها.',
    'You become its admin and can invite your family. It starts with ten budget categories you can change.',
  ],
  household_name: ['اسم البيت', 'Household name'],
  household_placeholder: ['مثال: بيت العيلة', 'e.g. The Family Home'],
  create_household: ['إنشاء البيت', 'Create household'],
  already_in: ['أنت بالفعل عضو في {name}', 'You are already in {name}'],
  request_sent: ['تم إرسال الطلب إلى {name}. يجب أن يوافق المسؤول.', 'Request sent to {name}. An admin there needs to approve you.'],
  leave_confirm: ['مغادرة {name}؟ ستحتاج دعوة جديدة للعودة.', 'Leave {name}? You will need a new invitation to come back.'],
  left: ['غادرت {name}', 'You left {name}'],
  delete_household_confirm: [
    'حذف {name}؟ سيتم حذف كل المصروفات والبنود والأعضاء للجميع، ولا يمكن التراجع.\n\nاكتب اسم البيت للتأكيد:',
    'Delete {name}? Its expenses, categories and members are removed for everyone. This cannot be undone.\n\nType the household name to confirm:',
  ],
  delete_household: ['حذف البيت', 'Delete household'],
  name_mismatch: ['الاسم غير مطابق، لم يُحذف شيء', 'The name did not match, so nothing was deleted'],
  deleted_named: ['تم حذف {name}', '{name} was deleted'],

  // roles
  role_pending: ['في انتظار الموافقة', 'Waiting for approval'],
  role_viewer: ['مشاهد (قراءة فقط)', 'Viewer (read only)'],
  role_member: ['عضو (يضيف ويعدّل المصروفات)', 'Member (adds and edits expenses)'],
  role_admin: ['مسؤول (كل الصلاحيات)', 'Admin (everything)'],

  // dashboard
  monthly: ['شهري', 'Monthly'],
  yearly: ['سنوي', 'Yearly'],
  prev: ['السابق', 'Previous'],
  next: ['التالي', 'Next'],
  this_month: ['الشهر الحالي', 'This month'],
  total_budget: ['إجمالي الميزانية', 'Total budget'],
  total_spent: ['إجمالي المصروف', 'Total spent'],
  surplus: ['المتبقي', 'Left to spend'],
  deficit: ['العجز', 'Over budget'],
  consumption: ['نسبة الاستهلاك', 'Budget used'],
  status_good: ['الميزانية في وضع جيد', 'The budget is on track'],
  status_warning: ['تنبيه: اقتربت من حد الميزانية', 'Heads up: close to the budget limit'],
  status_cats_over: [
    'بنود تجاوزت ميزانيتها: {count}. الإجمالي ما زال في الحدود.',
    'Categories over budget: {count}. The total is still on track.',
  ],
  status_danger: ['تم تجاوز الميزانية بمقدار {amount}', 'Spending is over budget by {amount}'],
  by_category: ['حسب البند', 'By category'],
  recent: ['آخر المصروفات', 'Recent expenses'],
  see_all: ['عرض الكل', 'See all'],
  no_expenses: ['لا توجد مصروفات في هذه الفترة', 'No expenses in this period'],
  add_first: ['سجّل أول مصروف', 'Add your first expense'],
  spent_of: ['{spent} من {budget}', '{spent} of {budget}'],
  over_by: ['تجاوز بـ {amount}', 'Over by {amount}'],
  left_amount: ['متبقي {amount}', '{amount} left'],
  no_category: ['بدون بند', 'No category'],
  by_payment: ['حسب طريقة الدفع', 'By payment method'],

  // add / edit
  add_title: ['تسجيل مصروف', 'Add expense'],
  edit_title: ['تعديل مصروف', 'Edit expense'],
  smart_title: ['اكتب أو تكلّم بالعامية', 'Type or speak it'],
  smart_hint: ['مثال: جبت لحمة بـ ٤٥٠ كاش، أو فاتورة نت ٢٠٠ فودافون كاش', 'e.g. Paid 150 for groceries by card, or electricity bill 300 cash'],
  smart_read: ['قراءة', 'Read it'],
  smart_private: ['يتم التحليل على جهازك، لا يُرسل النص إلى أي مكان.', 'Read on this device. The text is not sent anywhere.'],
  smart_filled: ['تم ملء الخانات أدناه. راجعها ثم احفظ.', 'The form below is filled in. Check it, then save.'],
  smart_no_amount: ['لم أجد مبلغًا. اكتب المبلغ في الخانة أدناه.', 'No amount found. Type it in the form below.'],
  mic_start: ['تحدّث', 'Speak'],
  mic_stop: ['إيقاف', 'Stop'],
  mic_listening: ['جارٍ الاستماع…', 'Listening…'],
  mic_unsupported: [
    'الإدخال الصوتي غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge أو Safari.',
    'Voice input is not supported in this browser. Try Chrome, Edge or Safari.',
  ],
  mic_denied: ['لم يُسمح باستخدام الميكروفون', 'Microphone access was not allowed'],
  mic_error: ['تعذّر التعرف على الصوت: {msg}', 'Voice input failed: {msg}'],
  amount: ['المبلغ', 'Amount'],
  category: ['البند', 'Category'],
  date: ['التاريخ', 'Date'],
  description: ['الوصف', 'Description'],
  description_placeholder: ['مثال: لحمة بلدي', 'e.g. Weekly groceries'],
  payment: ['طريقة الدفع', 'Payment method'],
  pay_cash: ['نقداً', 'Cash'],
  pay_card: ['بطاقة بنكية', 'Bank card'],
  pay_wallet: ['محفظة إلكترونية', 'E-wallet'],
  pay_transfer: ['تحويل بنكي', 'Bank transfer'],
  save_expense: ['حفظ المصروف', 'Save expense'],
  saved: ['تم حفظ المصروف', 'Expense saved'],
  updated: ['تم تحديث المصروف', 'Expense updated'],
  delete_expense_confirm: ['حذف هذا المصروف؟', 'Delete this expense?'],
  expense_deleted: ['تم حذف المصروف', 'Expense deleted'],
  undo: ['تراجع', 'Undo'],
  amount_required: ['اكتب مبلغًا أكبر من صفر', 'Enter an amount above zero'],
  read_only: ['لديك صلاحية المشاهدة فقط.', 'You have view-only access.'],
  added_by: ['أضافه {name}', 'Added by {name}'],

  // history
  history_title: ['سجل المصروفات', 'Expense history'],
  search: ['بحث في الوصف…', 'Search descriptions…'],
  all_categories: ['كل البنود', 'All categories'],
  all_payments: ['كل طرق الدفع', 'All payment methods'],
  sort_newest: ['الأحدث أولاً', 'Newest first'],
  sort_oldest: ['الأقدم أولاً', 'Oldest first'],
  sort_highest: ['الأعلى مبلغًا', 'Highest amount'],
  sort_lowest: ['الأقل مبلغًا', 'Lowest amount'],
  count: ['عدد المعاملات', 'Transactions'],
  total: ['الإجمالي', 'Total'],
  average: ['المتوسط', 'Average'],
  export_csv: ['تصدير CSV', 'Export CSV'],
  shown_of: ['{shown} من {total} مصروف', '{shown} of {total} expenses'],

  // categories
  categories_title: ['بنود الميزانية', 'Budget categories'],
  monthly_budget: ['الميزانية الشهرية', 'Monthly budget'],
  name_ar: ['الاسم بالعربية', 'Name in Arabic'],
  name_en: ['الاسم بالإنجليزية', 'Name in English'],
  color: ['اللون', 'Color'],
  add_category: ['إضافة بند', 'Add category'],
  new_category: ['بند جديد', 'New category'],
  edit_category: ['تعديل البند', 'Edit category'],
  category_saved: ['تم حفظ البند', 'Category saved'],
  delete_category_confirm: [
    'حذف البند "{name}"؟ ستبقى مصروفاته في السجل تحت "بدون بند".',
    'Delete "{name}"? Its expenses stay in the history under "No category".',
  ],
  category_deleted: ['تم حذف البند', 'Category deleted'],
  this_month_spent: ['مصروف هذا الشهر', 'Spent this month'],
  budget_total_hint: ['إجمالي الميزانية الشهرية: {amount}', 'Total monthly budget: {amount}'],
  name_required: ['اكتب اسم البند', 'Give the category a name'],

  // settings
  settings_title: ['الإعدادات', 'Settings'],
  language: ['لغة التطبيق', 'App language'],
  voice_language: ['لغة الإدخال الصوتي', 'Voice input language'],
  voice_privacy: [
    'الإدخال الصوتي يستخدم خدمة التعرف على الكلام في متصفحك، وقد يرسل المتصفح الصوت إلى خدمته (مثل Google في Chrome). قراءة النص نفسها تتم على جهازك.',
    "Voice input uses your browser's speech recognition, which may send the audio to the browser's own service (Google in Chrome). Reading the text happens on this device.",
  ],
  household_settings: ['إعدادات البيت', 'Household'],
  currency: ['العملة', 'Currency'],
  household_saved: ['تم حفظ إعدادات البيت', 'Household saved'],
  team: ['الأعضاء', 'Members'],
  manage_team: ['إدارة الأعضاء والدعوات', 'Members and invites'],
  switch_household: ['تبديل أو إضافة بيت', 'Switch or add a household'],
  backup_title: ['النسخ الاحتياطي', 'Backup'],
  backup_hint: [
    'بياناتك محفوظة في قاعدة البيانات ومشتركة مع أعضاء البيت. يمكنك أيضًا تنزيل ملف نسخة احتياطية (يعمل أيضًا مع تطبيق أندرويد).',
    'Your data is stored in the database and shared with your household. You can also download a backup file (it also works with the Android app).',
  ],
  backup_hint_demo: [
    'في وضع التجربة تُحفظ البيانات في هذا المتصفح فقط. نزّل نسخة احتياطية حتى لا تضيع.',
    'In demo mode the data lives only in this browser. Download a backup so it is not lost.',
  ],
  download_backup: ['تنزيل نسخة احتياطية', 'Download backup'],
  restore_backup: ['استعادة من ملف', 'Restore from file'],
  restore_admin_only: ['الاستعادة متاحة لمسؤول البيت فقط.', 'Only the household admin can restore a backup.'],
  restore_confirm: [
    'استعادة {expenses} مصروف و{categories} بند من الملف؟ سيتم استبدال كل بيانات هذا البيت الحالية للجميع.',
    'Restore {expenses} expenses and {categories} categories from this file? All current data in this household is replaced for everyone.',
  ],
  restore_button: ['استبدال واستعادة', 'Replace and restore'],
  restored: ['تمت استعادة {count} مصروف', '{count} expenses restored'],
  backup_bad: ['هذا الملف ليس نسخة احتياطية صالحة', 'This file is not a valid backup'],
  backup_empty: ['الملف لا يحتوي على بيانات', 'The file contains no data'],
  account: ['الحساب', 'Account'],
  privacy: ['الخصوصية', 'Privacy'],
  privacy_text: [
    'لا إعلانات ولا تتبع. البيانات تُحفظ في قاعدة بيانات Supabase الخاصة بك، ولا يراها إلا أعضاء البيت.',
    'No ads and no tracking. Data is kept in your own Supabase database and only your household members can see it.',
  ],

  // team
  team_title: ['الأعضاء', 'Members'],
  rename_household: ['إعادة تسمية البيت', 'Rename household'],
  invite_title: ['دعوة أفراد إلى {name}', 'Invite people to {name}'],
  invite_hint: [
    'أرسل الرابط أو رمز الانضمام. ينشئون حسابًا ويظهرون أدناه في الانتظار، وأنت تختار صلاحياتهم.',
    'Send this link or the join code. They create an account, appear below as waiting, and you choose what they can do.',
  ],
  invite_link: ['رابط الدعوة', 'Invite link'],
  copy_link: ['نسخ رابط الدعوة', 'Copy invite link'],
  link_copied: ['تم نسخ رابط الدعوة', 'Invite link copied'],
  copy_by_hand: ['انسخ رابط الدعوة وأرسله لأسرتك:', 'Copy this invite link and send it to your family:'],
  new_code: ['رمز انضمام جديد', 'New join code'],
  new_code_confirm: ['إنشاء رمز جديد؟ سيتوقف الرمز والرابط القديمان عن العمل.', 'Make a new join code? The old code and invite link will stop working.'],
  new_code_done: ['تم إنشاء رمز جديد', 'New join code made'],
  renamed: ['تمت إعادة التسمية', 'Household renamed'],
  waiting_count: ['{count} في انتظار الموافقة', '{count} waiting for approval'],
  you: ['أنت', 'You'],
  remove: ['إزالة', 'Remove'],
  remove_confirm: ['إزالة {name} من {household}؟', 'Remove {name} from {household}?'],
  removed: ['تمت إزالة {name}', '{name} was removed'],
  role_changed: ['{name} أصبح: {role}', '{name} is now: {role}'],
};

const idx = isAr ? 0 : 1;

export function t(key, vars) {
  const entry = S[key];
  let s = entry ? entry[idx] : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export const hasKey = (key) => Object.hasOwn(S, key);
