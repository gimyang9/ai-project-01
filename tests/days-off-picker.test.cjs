const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../days-off-picker.js'),D=require('../study-data.js');
test('legacy comma/newline dates normalize to unique sorted canonical dates',()=>{
 assert.deepEqual(P.parse(' 2026-11-08,\n2026-11-01  2026-11-08\t2026-12-31 ',D.date),{dates:['2026-11-01','2026-11-08','2026-12-31'],invalid:0});
 assert.deepEqual(P.parse('',D.date),{dates:[],invalid:0});
});
test('invalid dates are excluded and reported; leap dates remain valid',()=>{
 assert.deepEqual(P.parse('2024-02-29,2023-02-29,2026-11-31,bad,2026-01-02',D.date),{dates:['2024-02-29','2026-01-02'],invalid:3});
});
