export const legalDocSlugs = [
  "privacy",
  "terms",
  "health-disclaimer",
] as const;

export type LegalDocSlug = (typeof legalDocSlugs)[number];

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDoc = {
  slug: LegalDocSlug;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
};

export const legalDocs: LegalDoc[] = [
  {
    slug: "privacy",
    title: "隐私保护指引",
    description: "说明 Personal Health Checker 如何处理账号资料、健康记录和使用数据。",
    updatedAt: "2026-06-12",
    sections: [
      {
        title: "我们会收集哪些信息",
        bullets: [
          "账号信息：邮箱、昵称、登录会话和账号安全相关记录。",
          "健康记录：睡眠、体重、饮水、目标设置、补录标记和你主动添加的日常背景标签。",
          "使用数据：注册、登录、记录保存、页面访问、报告内测意向等产品事件。",
          "小程序登录信息：微信登录 code 换取的身份标识和用于访问本服务的会话 token。",
        ],
      },
      {
        title: "这些信息如何使用",
        bullets: [
          "用于保存和展示你的个人健康记录、趋势、目标进度和站内提醒。",
          "用于账号登录、安全校验、数据导出、账号删除等基础服务。",
          "用于理解关键路径是否顺畅，例如首次记录完成率、回访情况和功能使用分布。",
          "不会用于医疗诊断、治疗建议、保险评估或自动化高风险决策。",
        ],
      },
      {
        title: "数据控制",
        bullets: [
          "你可以在账号数据入口导出个人资料、目标、记录和相关上下文数据。",
          "你可以删除账号和全部关联数据；删除后数据不可恢复。",
          "你可以选择不填写某些健康记录，但缺失数据会影响趋势和达标率展示。",
        ],
      },
      {
        title: "数据安全",
        paragraphs: [
          "我们使用服务端会话、密码加密和访问校验保护账号与记录数据。健康记录属于敏感个人信息，请仅在你信任的设备和网络环境中使用本服务。",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "用户协议",
    description: "说明 Personal Health Checker 的使用边界、账号规则和数据责任。",
    updatedAt: "2026-06-12",
    sections: [
      {
        title: "服务定位",
        paragraphs: [
          "Personal Health Checker 是面向个人的健康记录与趋势回看工具，帮助你记录睡眠、体重、饮水和相关日常背景。",
          "本服务不提供医疗诊断、治疗方案、用药建议或替代医生判断的结论。",
        ],
      },
      {
        title: "账号使用",
        bullets: [
          "你应使用真实可访问的邮箱或微信账号完成登录，并妥善保管账号访问权限。",
          "你应对自己录入的数据真实性和完整性负责。",
          "如果发现账号异常，应及时退出登录、重置密码或删除账号数据。",
        ],
      },
      {
        title: "产品使用边界",
        bullets: [
          "请不要将本服务生成的趋势、提醒或摘要作为医疗诊断依据。",
          "如出现明显不适、疾病风险或需要治疗的问题，应咨询具备资质的专业人士。",
          "请不要录入他人的敏感健康信息，除非你已获得充分授权。",
        ],
      },
      {
        title: "功能变化",
        paragraphs: [
          "我们会围绕持续记录、数据可信度和回看价值持续改进产品。新增功能可能会先以体验版或内测入口出现，并在成熟后进入稳定功能。",
        ],
      },
    ],
  },
  {
    slug: "health-disclaimer",
    title: "健康免责声明",
    description: "说明趋势、目标和提醒的非医疗属性。",
    updatedAt: "2026-06-12",
    sections: [
      {
        title: "记录不是诊断",
        paragraphs: [
          "本服务展示的睡眠、体重、饮水趋势和目标反馈，只基于你主动录入的数据进行整理，不构成医疗诊断或治疗建议。",
        ],
      },
      {
        title: "趋势只代表记录范围",
        bullets: [
          "缺失记录、补录记录、测量时间差异和设备误差都会影响趋势展示。",
          "体重变化可能受到饮食、活动、饮水、睡眠、周期和测量条件影响，不能直接归因于单一原因。",
          "达标率和连续记录天数只用于帮助建立记录习惯，不代表健康状态好坏。",
        ],
      },
      {
        title: "何时寻求专业帮助",
        paragraphs: [
          "如果你出现持续不适、体重快速异常变化、睡眠长期严重受影响或其他健康疑虑，请及时咨询医生或专业健康服务机构。",
        ],
      },
    ],
  },
];

export function getLegalDoc(slug: string) {
  return legalDocs.find((doc) => doc.slug === slug) ?? null;
}
