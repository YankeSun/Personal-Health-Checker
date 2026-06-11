import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", ".vercel/output/**", "miniprogram/**"],
  },
  ...nextVitals,
];

export default config;
