type Text = { ar: string; en: string };
export const company = {
  name: "Nippon Miners",
  tagline: { ar: "شركة تقنية متخصصة في سوق أجهزة تعدين العملات الرقمية", en: "A technology company dedicated to the crypto mining hardware market" } as Text,
  intro: { ar: "Nippon Miners تبني وتدير منصة رقمية تجمع البائعين والمشترين لأجهزة تعدين العملات الرقمية في بيئة منظمة، مع حجز المبالغ لحماية المشتري حتى استلام الجهاز.", en: "Nippon Miners builds and operates a digital marketplace that connects buyers and sellers of crypto mining hardware in an organized environment, holding funds in escrow to protect buyers until the device is received." } as Text,
  leader: { name: { ar: "عبدالهادي العجيلي", en: "Abdulhadi Elagili" } as Text, title: { ar: "العضو المدير والرئيس التنفيذي", en: "Managing Member & CEO" } as Text },
  activities: [
    { title: { ar: "إدارة المنصات الرقمية", en: "Digital Platform Management" }, body: { ar: "تشغيل وإدارة منصة سوق متخصصة بنظام ضمان مالي يحجز المبلغ حتى يؤكد المشتري الاستلام.", en: "Operating a specialized marketplace with an escrow system that holds payment until the buyer confirms receipt." } },
    { title: { ar: "تجارة وتوريد أجهزة التعدين", en: "Crypto Mining Hardware Trading" }, body: { ar: "تجارة وتوريد أجهزة ومعدات تعدين العملات الرقمية من نوع ASIC و GPU.", en: "Trading and supplying ASIC and GPU crypto mining hardware and equipment." } },
    { title: { ar: "الخدمات التقنية", en: "Technical Services" }, body: { ar: "استشارات تقنية وحلول البنية التحتية لمشاريع التعدين من التخطيط حتى التشغيل.", en: "Technical consulting and infrastructure solutions for mining projects, from planning to operation." } },
  ] as { title: Text; body: Text }[],
  vision: { ar: "أن نكون الوجهة الأكثر ثقة لتداول أجهزة التعدين، وأن نساهم في تنظيم سوق ظل لسنوات يعتمد على الصفقات الفردية غير المضمونة.", en: "To be the most trusted destination for trading mining hardware, and to help organize a market that has long relied on unprotected one-off deals." } as Text,
  values: [
    { title: { ar: "الشفافية", en: "Transparency" }, body: { ar: "رسوم واضحة ومعلنة، وسجل كامل لكل عملية في المحفظة.", en: "Clear, published fees and a full record of every wallet transaction." } },
    { title: { ar: "الأمان", en: "Security" }, body: { ar: "حجز المبالغ حتى الاستلام، وحماية بيانات المستخدمين الشخصية.", en: "Funds held until delivery, and users' personal data kept private." } },
    { title: { ar: "العدالة", en: "Fairness" }, body: { ar: "نظام نزاعات يراجعه مشرفون مختصون لكل دولة.", en: "A dispute process reviewed by dedicated supervisors in each country." } },
  ] as { title: Text; body: Text }[],
};
