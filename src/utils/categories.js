// 카테고리 정의 및 유틸리티 함수
export const getAllCategories = (t) => [
  { id: 'tojeong', label: t('home.tojeong'), desc: t('home.tojeongDesc'), icon: '📜' },
  { id: 'saju', label: t('home.saju'), desc: t('home.sajuDesc'), icon: '🔮' },
  { id: 'compatibility', label: t('home.compatibility'), desc: t('home.compatibilityDesc'), icon: '💕' },
  { id: 'love', label: t('home.love'), desc: t('home.loveDesc'), icon: '💖' },
  { id: 'constellation', label: t('home.constellation'), desc: t('home.constellationDesc'), icon: '⭐' },
  { id: 'money', label: t('home.money'), desc: t('home.moneyDesc'), icon: '💰' },
  { id: 'health', label: t('home.health'), desc: t('home.healthDesc'), icon: '❤️' },
  { id: 'career', label: t('home.career'), desc: t('home.careerDesc'), icon: '💼' },
  { id: 'study', label: t('home.study'), desc: t('home.studyDesc'), icon: '📚' },
  { id: 'relationship', label: t('home.relationship'), desc: t('home.relationshipDesc'), icon: '🤝' },
  { id: 'today', label: t('home.today'), desc: t('home.todayDesc'), icon: '✨' },
  { id: 'zodiac', label: t('home.zodiac'), desc: t('home.zodiacDesc'), icon: '🐉' },
  { id: 'newyear', label: t('home.newyear'), desc: t('home.newyearDesc'), icon: '🎊' }
];

export const getCategoryById = (categoryId, t) => {
  const categories = getAllCategories(t);
  return categories.find(cat => cat.id === categoryId) || null;
};

// 카테고리별 필요한 입력 필드 체크
export const requiresBirthTime = (categoryId) => {
  return categoryId !== 'today' && categoryId !== 'zodiac' && categoryId !== 'constellation';
};

export const requiresGender = (categoryId) => {
  return categoryId !== 'today' && categoryId !== 'zodiac' && categoryId !== 'constellation';
};

export const requiresBirthDate = (categoryId) => {
  return categoryId !== 'today';
};
