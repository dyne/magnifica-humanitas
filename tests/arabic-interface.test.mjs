import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {english,validateMessages,formatMessage,formatDisposition,formatSavedBlock} from '../scripts/messages.mjs';
import {availableLocales,localeRegistry,resolveBrowserLocale,resolveLocaleRoute} from '../scripts/locales.mjs';
import {loadReadingInputs,validateReading} from '../scripts/reading-content.mjs';
import {searchPublished,normalizeQuery} from '../scripts/search.mjs';
const read=p=>JSON.parse(readFileSync(new URL(`../${p}`,import.meta.url)));
const messages=read('content/messages/ar.json');
const {reading}=loadReadingInputs('ar');

test('Arabic publishes complete local reading and all291 catalog keys with exact placeholders',()=>{
  assert.deepEqual(validateReading(loadReadingInputs('ar')),[]);
  assert.deepEqual(validateMessages(messages),[]);
  assert.equal(Object.keys(messages).length,291);
  for(const [key,value] of Object.entries(messages))if(key!=='block.description')assert.notEqual(value,english[key],key);
  assert.deepEqual(availableLocales.map(l=>l.id),['en','it','de','es','fr','pt','pl','be','ru','ar']);
  assert.equal(localeRegistry.find(l=>l.id==='ar').dir,'rtl');
  assert.equal(messages['about.mh_en_owner_2026'],reading.editionId);
  assert.match(messages['about.this_is_an_english_editorial_reading_of_leo_xiv_s'],/بالعربية.*لاون الرابع عشر/);
  const review=read('content/editorial/ar/interface-review.json');
  assert.equal(review.catalogSha256,createHash('sha256').update(readFileSync(new URL('../content/messages/ar.json',import.meta.url))).digest('hex'));
  assert.equal(review.readingRevision,reading.revision);
});

test('Arabic labels, count grammar, numerals and saved notices use local terms',()=>{
  for(const r of read('content/editorial/ar/alignment-review.json').relationLabels)assert.equal(messages[`relation.${r.type}`],r.label);
  assert.equal(formatDisposition('retain',messages),'إبقاء');
  assert.equal(formatSavedBlock('dignity-worth',reading.concepts,'ar',messages),'كرامة الإنسان · الحجّة ١');
  assert.equal(formatMessage(messages,'state.returned',{place:'كرامة الإنسان'}),'عُدت إلى كرامة الإنسان.');
  assert.equal(new Intl.NumberFormat('ar', { numberingSystem: 'arab' }).format(24500),'٢٤٬٥٠٠');
  for(const count of ['٠','١','٢','٣','١١','١٠٠'])assert.equal(formatMessage(messages,'search.value_results',{value1:count}),`عدد النتائج: ${count}`);
  assert.match(messages['note.bibliographic_context_ibid_refers_to_the_preceding_citation'],/المرجع نفسه.*العمل السابق.*المؤلّف نفسه.*عمل آخر/);
});

test('Arabic search folds harakat, tatweel and alif variants without flattening other letters',()=>{
  assert.equal(normalizeQuery(' كَـرَامَة الإِنْسَانِ  ','ar-EG'),'كرامة الانسان');
  assert.equal(normalizeQuery('أإآٱ','ar'),'اااا');
  assert.equal(normalizeQuery('ا\u0654','ar'),'ا');
  for(const [a,b] of [['ؤ','و'],['ئ','ي'],['ي','ى'],['ة','ه']])assert.notEqual(normalizeQuery(a,'ar'),normalizeQuery(b,'ar'));
  assert.equal(normalizeQuery('ي\u0654','ar'),'ئ');
  assert.equal(normalizeQuery('ЙЁ','ru'),'йё');assert.equal(normalizeQuery('Ў','be'),'ў');
  const search=q=>searchPublished(reading,reading.readingSequence,q,{locale:'ar',messages});
  for(const q of ['كرامة الإنسان','كَرَامَة الإِنْسَان','كـرامة الانسان'])assert.equal(search(q)[0].id,'concept-dignity');
  assert.equal(search('اللامركزية والتكامل في اتخاذ القرار')[0].id,'concept-subsidiarity');
  for(const q of ['فقرة ٥٢','فقرة ۵۲','§52','p052']){assert.equal(search(q).length,1);assert.equal(search(q)[0].to,'/ar/read?at=read-p052');assert.equal(search(q)[0].type,'فقرة مكيّفة');}
  assert.deepEqual(search('zzzzلايوجد'),[]);
  const fixture={concepts:['مؤ','مو','مئ','مي','مى','مة','مه'].map((title,i)=>({id:String(i),title,definition:{text:title,sourceRefs:['p001']},necessaryDistinction:{text:''},reasoning:[]})),relations:[],trails:[]};
  for(const [i,q] of ['مؤ','مو','مئ','مي','مى','مة','مه'].entries())assert.deepEqual(searchPublished(fixture,[],q,{locale:'ar',messages}).map(r=>r.id),[`concept-${i}`]);
});

test('Arabic regional defaults respect first supported preference and every explicit edition',()=>{
  for(const tag of ['ar','AR-eg','ar-SA','ar-MA','ar-Latn'])assert.equal(resolveBrowserLocale({languages:['zh-CN',tag,'en']}),'ar');
  for(const tag of ['en-GB','it-IT','de-AT','es-MX','fr-BE','pt-BR','pl-PL','be-BY','ru-RU'])assert.equal(resolveBrowserLocale({languages:[tag,'ar-EG']}),tag.split('-')[0]);
  assert.equal(resolveBrowserLocale({languages:['ja','zh'],language:'ar-KW'}),'ar');
  assert.equal(resolveBrowserLocale({languages:['ja','zh'],language:'xx'}),'en');
  for(const locale of availableLocales)assert.equal(resolveLocaleRoute(`/${locale.id}/source/p052?at=x#quote`,{languages:['ar']}),`/${locale.id}/source/p052?at=x#quote`);
  assert.equal(resolveLocaleRoute('/search?q=رعاية#stable',{languages:['ar-EG']}),'/ar/search?q=رعاية#stable');
  assert.equal(resolveLocaleRoute('/zh/source/p052',{languages:['ar']}),'/en/source/p052');
});

test('Arabic bundled font and license retain pinned upstream integrity',()=>{
  const hash=p=>createHash('sha256').update(readFileSync(new URL(`../${p}`,import.meta.url))).digest('hex');
  assert.equal(hash('public/fonts/NotoSansArabic-variable.ttf'),'63111b5b2e074dd48cc67692e0a2726d86ee94c1c37fe8598257b7b4e87e869e');
  assert.equal(hash('public/licenses/Noto-Sans-Arabic-OFL.txt'),'07fc70bfeb985cc1a87a8587d0a0c80bab11c86c9dc3fd95b6f0cb332f983e96');
  assert.match(readFileSync(new URL('../src/style.css',import.meta.url),'utf8'),/url\('\/fonts\/NotoSansArabic-variable.ttf'\)/);
});
