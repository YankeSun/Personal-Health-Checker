import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", ".vercel/output/**"],
  },
  ...nextVitals,
];

export default config;
