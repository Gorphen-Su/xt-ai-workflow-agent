// 终端彩色输出封装（基于 kleur）。
// 约定：info/success/section/detail 走 stdout；warn/error 走 stderr。每条都自动追加 \n。

import kleur from 'kleur';

function writeOut(s) {
  process.stdout.write(s + '\n');
}
function writeErr(s) {
  process.stderr.write(s + '\n');
}

export function info(msg) {
  writeOut(String(msg));
}

export function success(msg) {
  writeOut(kleur.green(String(msg)));
}

export function warn(msg) {
  writeErr(kleur.yellow(String(msg)));
}

export function error(msg) {
  writeErr(kleur.red(String(msg)));
}

export function section(title) {
  writeOut(kleur.bold().cyan(String(title)));
}

export function detail(msg) {
  writeOut(kleur.dim(String(msg)));
}
