export const R4_GENERAL_FLOW = Object.freeze([
  "简单说",
  "具体来看",
  "为什么这么做",
  "还要分清",
]);

export const R4_EVENT_FLOW = Object.freeze([
  "这件事现在知道什么",
  "企业当时怎么处理",
  "后来有没有明确结论",
  "这件事让我们观察什么",
]);

export const R4_INSUFFICIENT_FLOW = Object.freeze([
  "简单说",
  "目前能确认什么",
  "为什么还不能下结论",
  "还缺什么信息",
]);

function formatFlow(flow) {
  return flow.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

export function createR4AnswerGuidance({ track, insufficientReason = "", hasEvidence = true }) {
  if (track === "case") {
    return {
      mode: "event",
      requiredMoves: [...R4_EVENT_FLOW],
      prompt: `【面向用户的回答方式】
请按下面的理解顺序自然组织热点事件回答：
${formatFlow(R4_EVENT_FLOW)}
第一步只说当前资料能确认的事件信息；第二步清楚归因企业当时的回应或处理；第三步明确区分企业回应、媒体记录、监管结论和司法结论；第四步只把公开、负责、尊重、纠错等作为观察文化的问题，不能用文化口号裁定客诉真伪。
这四步是理解顺序，不是必须逐字显示的四个标题。可以根据问题长短自然合并，但不能省略会改变结论的事件阶段和事实边界。不要以“根据资料库检索”开场，也不要向用户展示内部字段或证据分级。`,
    };
  }

  if (insufficientReason || !hasEvidence) {
    return {
      mode: "insufficient",
      requiredMoves: [...R4_INSUFFICIENT_FLOW],
      prompt: `【面向用户的回答方式】
请按下面的理解顺序自然组织资料不足的回答：
${formatFlow(R4_INSUFFICIENT_FLOW)}
第一句直接告诉用户当前资料能否回答，不要先讲检索过程。已有资料能确认什么就简要说什么；说明为什么这些资料还不足以推出用户要的结论；最后用普通话说明还需要哪类信息。不得用相近主题、历史数字、一般理念或常识猜测来补空白。
这四步是理解顺序，不是必须逐字显示的四个标题。短回答可以自然合并，也不要堆叠免责声明、内部字段或证据分级。`,
    };
  }

  return {
    mode: "general",
    requiredMoves: [...R4_GENERAL_FLOW],
    prompt: `【面向用户的回答方式】
请按下面的理解顺序自然组织一般文化回答：
${formatFlow(R4_GENERAL_FLOW)}
“简单说”要在第一段用一两句话直接回答，不以“根据资料库检索”或来源说明开场；“具体来看”只选择一至三个最相关、可核验的做法或例子；“为什么这么做”要解释它与员工、顾客、经营或责任的关系，以及为何能帮助理解“自由与爱”，不能只复述口号；“还要分清”要自然说明资料是谁的说法、对应什么时间、适用范围和不能推出什么，并在有需要时呈现现实争议或不同观点。
这四步是理解顺序，不是必须逐字显示的四个标题。短问题可以自然合并，但不能省略会改变结论的重要限制。不要堆来源，不要向用户展示内部字段或证据分级，也不要把回答写成单向赞美。`,
  };
}
