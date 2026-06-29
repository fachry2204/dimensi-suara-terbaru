/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/ffprobe-static";
exports.ids = ["vendor-chunks/ffprobe-static"];
exports.modules = {

/***/ "(rsc)/./node_modules/ffprobe-static/index.js":
/*!**********************************************!*\
  !*** ./node_modules/ffprobe-static/index.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("//\n// With credits to https://github.com/eugeneware/ffmpeg-static\n//\nvar os = __webpack_require__(/*! os */ \"os\");\nvar path = __webpack_require__(/*! path */ \"path\");\n\nvar platform = os.platform();\nif (platform !== 'darwin' && platform !=='linux' && platform !== 'win32') {\n  console.error('Unsupported platform.');\n  process.exit(1);\n}\n\nvar arch = os.arch();\nif (platform === 'darwin' && arch !== 'x64' && arch !== 'arm64') {\n  console.error('Unsupported architecture.');\n  process.exit(1);\n}\n\nvar ffprobePath = path.join(\n  __dirname,\n  'bin',\n  platform,\n  arch,\n  platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'\n);\n\nexports.path = ffprobePath;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvZmZwcm9iZS1zdGF0aWMvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0EsU0FBUyxtQkFBTyxDQUFDLGNBQUk7QUFDckIsV0FBVyxtQkFBTyxDQUFDLGtCQUFNOztBQUV6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsWUFBWSIsInNvdXJjZXMiOlsiRDpcXHhhbXBwXFxodGRvY3NcXGRpbWVuc2lzdWFyYWNtc2JhcnVcXGRpbWVuc2ktc3VhcmEtdGVyYmFydVxcbm9kZV9tb2R1bGVzXFxmZnByb2JlLXN0YXRpY1xcaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy9cbi8vIFdpdGggY3JlZGl0cyB0byBodHRwczovL2dpdGh1Yi5jb20vZXVnZW5ld2FyZS9mZm1wZWctc3RhdGljXG4vL1xudmFyIG9zID0gcmVxdWlyZSgnb3MnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG52YXIgcGxhdGZvcm0gPSBvcy5wbGF0Zm9ybSgpO1xuaWYgKHBsYXRmb3JtICE9PSAnZGFyd2luJyAmJiBwbGF0Zm9ybSAhPT0nbGludXgnICYmIHBsYXRmb3JtICE9PSAnd2luMzInKSB7XG4gIGNvbnNvbGUuZXJyb3IoJ1Vuc3VwcG9ydGVkIHBsYXRmb3JtLicpO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59XG5cbnZhciBhcmNoID0gb3MuYXJjaCgpO1xuaWYgKHBsYXRmb3JtID09PSAnZGFyd2luJyAmJiBhcmNoICE9PSAneDY0JyAmJiBhcmNoICE9PSAnYXJtNjQnKSB7XG4gIGNvbnNvbGUuZXJyb3IoJ1Vuc3VwcG9ydGVkIGFyY2hpdGVjdHVyZS4nKTtcbiAgcHJvY2Vzcy5leGl0KDEpO1xufVxuXG52YXIgZmZwcm9iZVBhdGggPSBwYXRoLmpvaW4oXG4gIF9fZGlybmFtZSxcbiAgJ2JpbicsXG4gIHBsYXRmb3JtLFxuICBhcmNoLFxuICBwbGF0Zm9ybSA9PT0gJ3dpbjMyJyA/ICdmZnByb2JlLmV4ZScgOiAnZmZwcm9iZSdcbik7XG5cbmV4cG9ydHMucGF0aCA9IGZmcHJvYmVQYXRoO1xuIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/ffprobe-static/index.js\n");

/***/ })

};
;