'use strict';
const fs=require('fs');
const app=fs.readFileSync(require('path').join(__dirname,'..','app.js'),'utf8');
const required=['function getDayState(','function getDynamicCapacity(','function getTemporalPriority(','function getTaskRiskBreakdown(','function getDurationPrediction(','function getTaskFormalState(','function adeConfidence('];
for(const token of required){if(!app.includes(token))throw new Error(`ADE contract missing: ${token}`);}
if(!app.includes('dayState=getDayState(today)'))throw new Error('Home is not consuming DayState');
if(!app.includes('const dayState=getDayState(todayISO());'))throw new Error('Next action is not consuming DayState');
console.log(`ADE contract: ${required.length+2} checks OK`);
