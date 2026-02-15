module.exports = {
  default: {
    require: ["backend/features/steps/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress", "html:cucumber-report.html"],
    paths: ["backend/features/**/*.feature"],
  },
};
