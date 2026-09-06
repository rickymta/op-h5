/* `.cjs` vì package.json khai `"type": "module"`; postcss-load-config đọc được cả hai. */
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
