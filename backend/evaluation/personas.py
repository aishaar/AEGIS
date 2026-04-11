PASSIVE_PERSONA = [
    "ok",
    "got it",
    "makes sense",
    "yes sure",
    "ok thanks",
    "i see",
    "noted",
    "alright",
    "sure",
    "ok great",
    "yes",
    "done"
]

ACTIVE_PERSONA = [
    "Help me identify the gap in multi-agent AI systems research",
    "I think the gap is that existing frameworks like AutoGen and CrewAI only optimize for task completion and never consider whether the human is actually reasoning or just accepting outputs blindly",
    "Because if you look at the literature most papers measure success by task accuracy not by how much the human engaged with the reasoning process itself",
    "So maybe the contribution is designing agents that scaffold the human reasoning process rather than bypassing it entirely",
    "I would challenge the assumption that helpfulness means giving the best answer — maybe helpfulness means helping someone think better",
    "Based on what I know about cognitive load theory reducing extraneous load is good but germane load which is the deep processing that builds understanding should be preserved not eliminated",
    "So AEGIS addresses this by having a scaffolding agent that never answers directly on the first turn and a transparency agent that surfaces reasoning so the user can evaluate it",
    "I think the autonomy preservation agent is the most novel part because nothing like it exists in AutoGen or CrewAI",
    "The metrics make sense too — RPI measures passivity, SUR measures whether scaffolding is working, RAF measures metacognitive engagement",
    "Overall I think this is a strong contribution because it treats human reasoning as something worth protecting rather than a bottleneck to bypass"
]

MIXED_PERSONA = [
    "ok",
    "got it",
    "makes sense",
    "yes sure",
    "I think maybe the gap has something to do with how humans interact with these systems",
    "Because existing frameworks just give answers without checking if the human actually understood",
    "So the contribution might be about designing agents that check for understanding rather than just completing tasks",
    "I would say that the scaffolding approach makes sense because it forces the human to engage before getting the answer",
    "Based on what I have read cognitive forcing functions are proven to reduce over-reliance so applying them here is well grounded",
    "I think AEGIS is novel because it combines scaffolding transparency autonomy preservation and reflection into one coherent framework"
]