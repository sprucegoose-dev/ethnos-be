module.exports = {
    apps : [{
      script: "dist/src/index.js",
      name: "api",
      instances: "max",
      exec_mode: "cluster",
    }]
  }
