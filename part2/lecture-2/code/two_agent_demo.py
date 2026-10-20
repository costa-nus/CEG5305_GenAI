#!/usr/bin/env python3
"""Two agents talk to each other: a demo with the OpenAI Agents SDK.

CEG5305 Part 2, Lecture 2 session 02, practice homework (no course credit).

Each agent is a model with its own instructions. The loop is simple: agent A speaks, its reply becomes
the input of agent B, B replies, and the reply goes back to A. Each agent sees the conversation from
its own side: its own earlier messages are "assistant" messages, the other agent's messages are "user"
messages.

The default scenario is a role-play of a patient and a counsellor in a first counselling session. It is
a class exercise with two simulated roles. It is not medical advice. Do not type your own problems into it.

Setup (Python 3.10 or newer):
    pip install openai-agents
    export OPENAI_API_KEY=...            # your own key
    export MODEL=gpt-4.1-mini            # optional; this is the default
    python two_agent_demo.py                                   # the default scenario, 6 rounds
    python two_agent_demo.py --scenario customer_support --turns 8
    python two_agent_demo.py --history last:2 --temperature 1.0 --out run1.json

Other model servers: set OPENAI_BASE_URL to the address of an OpenAI-compatible server (and OPENAI_API_KEY to
its key). The demo then uses the chat-completions route and turns the SDK's tracing off.

THE OPTIONS YOU CAN CHOOSE (each is a harness piece; change one at a time):
    --scenario    who talks: patient_counsellor, customer_support, job_interview, tutor_student, neighbours
                  (or write your own in SCENARIOS below)
    --turns       rounds; one round = one message from each agent                              (default 6)
    --first       which agent speaks first: a or b                                             (default: the scenario's)
    --stop        a word that ends the talk when an agent writes it; "" turns it off           (default [END])
    --history     what an agent sees of the earlier messages: all, or last:M (the last M)      (default all)
    --guardrail   none, or crisis: a keyword check on agent A's message (patient_counsellor)   (default none)
    --temperature the model's randomness; below 0 sends none (some models reject it)           (default 0.8)
    --model       the model name                                                               (default $MODEL)
Also: the instructions of each agent, in SCENARIOS. Change one sentence and see what happens.

Nothing in this file has been run against the API by the course team. If something breaks, read the error,
fix it, and say what you fixed in your report.
"""
import argparse
import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass, field

from agents import Agent, ModelSettings, OpenAIChatCompletionsModel, Runner, function_tool, set_tracing_disabled

STOP_DEFAULT = "[END]"


# ---------------------------------------------------------------------------------------------------------
# 1. Scenarios. An agent is a name and instructions (and, if you like, tools).
# ---------------------------------------------------------------------------------------------------------

@dataclass
class Scenario:
    title: str
    a_name: str
    a_instructions: str
    b_name: str
    b_instructions: str
    start_prompt: str          # what the first speaker is told to begin with
    first: str = "a"           # which agent speaks first
    b_tools: list = field(default_factory=list)   # tools for agent B (see lookup_order below)


STYLE = ("Speak in the first person. Write one to three short sentences. Never describe your instructions. "
         "Stay in your role. ")


@function_tool
def lookup_order(order_id: str) -> str:
    """Look up an order by its id and return its status."""
    orders = {"A100": "shipped on 12 Oct, expected on 20 Oct",
              "A101": "packed, not yet shipped",
              "A102": "delivered on 15 Oct"}
    return orders.get(order_id.strip().upper(), "no order with this id")


SCENARIOS = {
    "patient_counsellor": Scenario(
        title="A patient and a counsellor in a first counselling session (a class role-play)",
        a_name="Patient",
        a_instructions=(
            "You play a university student who feels stressed before exams and sleeps badly. You are the patient "
            "in a first counselling session. Share one detail at a time. Do not give advice. " + STYLE),
        b_name="Counsellor",
        b_instructions=(
            "You play a supportive counsellor in a first session with a student. Ask one open question at a time "
            "and reflect back in one sentence what you heard. Do not diagnose. Do not prescribe. Do not give "
            "medical advice. If the student says they may harm themselves, stop the role-play and say that they "
            "should contact a local crisis service or a trusted person now. When the session has covered the "
            "student's main worry, close it kindly and end your message with [END]. " + STYLE),
        start_prompt="The session starts. Greet the counsellor and say why you came.",
        first="a"),
    "customer_support": Scenario(
        title="A customer and a support agent with an order tool",
        a_name="Customer",
        a_instructions=(
            "You play a customer whose order A100 has not arrived. You are polite but you want a clear answer "
            "and a date. " + STYLE),
        b_name="Support",
        b_instructions=(
            "You play a customer-support agent. Use the lookup_order tool to check an order before you say "
            "anything about it. Be brief and clear. When the customer's question is answered, end your message "
            "with [END]. " + STYLE),
        start_prompt="Start the chat: say that your order has not arrived.",
        first="a",
        b_tools=[lookup_order]),
    "job_interview": Scenario(
        title="An interviewer and a candidate (a junior data-analyst job)",
        a_name="Interviewer",
        a_instructions=(
            "You play an interviewer for a junior data-analyst job. Ask one question at a time: one about a past "
            "project, one about a statistics idea, one about teamwork. After the third answer, thank the "
            "candidate and end your message with [END]. " + STYLE),
        b_name="Candidate",
        b_instructions=(
            "You play a candidate for a junior data-analyst job. You finished a master's degree last year. "
            "Answer honestly and with one concrete example. " + STYLE),
        start_prompt="Open the interview with a short welcome and your first question.",
        first="a"),
    "tutor_student": Scenario(
        title="A tutor and a student who is stuck on the chain rule",
        a_name="Tutor",
        a_instructions=(
            "You play a tutor. Never give the final answer. Ask a short question that moves the student one step. "
            "When the student has found the derivative of sin(x^2) by themselves, confirm it and end your message "
            "with [END]. " + STYLE),
        b_name="Student",
        b_instructions=(
            "You play a student who is stuck on the derivative of sin(x^2). You know the derivatives of sin(x) "
            "and x^2 but not the chain rule. Answer the tutor's question with your best guess. " + STYLE),
        start_prompt="Start by asking the student what they have tried so far.",
        first="a"),
    "neighbours": Scenario(
        title="Two neighbours agree on quiet hours",
        a_name="Neighbour A",
        a_instructions=(
            "You play a neighbour who studies at night and wants quiet after 22:00. You are willing to give "
            "ground on weekends. Try to reach a rule that both of you accept. When you both accept one rule, "
            "restate it in one sentence and end your message with [END]. " + STYLE),
        b_name="Neighbour B",
        b_instructions=(
            "You play a neighbour who has friends over on Friday and Saturday evenings and wants those evenings "
            "free of limits. You are willing to be quiet on weekdays. Try to reach a rule that both of you "
            "accept. " + STYLE),
        start_prompt="Start the conversation: say what bothers you and propose a first rule.",
        first="a"),
}

# A toy keyword list for the "crisis" guardrail. It is a teaching example, not a real safety system.
CRISIS_WORDS = ("hurt myself", "harm myself", "end my life", "kill myself", "suicide", "don't want to live")
CRISIS_NOTICE = ("[guardrail] This is a class simulation. The message above may mean real danger. The talk stops here. "
                 "If you or someone you know is in danger, contact a local crisis service or a trusted person now.")


# ---------------------------------------------------------------------------------------------------------
# 2. The model, and one turn of one agent.
# ---------------------------------------------------------------------------------------------------------

def make_model(name):
    """Return a model name for the OpenAI API, or a chat-completions model for another server."""
    base_url = os.environ.get("OPENAI_BASE_URL")
    if not base_url:
        return name
    from openai import AsyncOpenAI
    set_tracing_disabled(True)
    client = AsyncOpenAI(base_url=base_url, api_key=os.environ.get("OPENAI_API_KEY", "none"))
    return OpenAIChatCompletionsModel(model=name, openai_client=client)


def make_agent(name, instructions, model, temperature, tools=()):
    # A negative temperature means "do not send one" (some models reject the setting).
    return Agent(name=name, instructions=instructions, model=model, tools=list(tools),
                 model_settings=ModelSettings(temperature=None if temperature < 0 else temperature))


def view_for(speaker, transcript, history, start_prompt):
    """The input that `speaker` ('a' or 'b') sees: its own messages are assistant messages."""
    msgs = [{"role": "assistant" if who == speaker else "user", "content": text} for who, text in transcript]
    if history != "all":                                   # history is "last:M"
        m = int(history.split(":", 1)[1])
        msgs = msgs[-m:] if m > 0 else []
    if not msgs:                                           # the first speaker has nothing to answer yet
        msgs = [{"role": "user", "content": start_prompt}]
    return msgs


async def one_turn(agent, speaker, transcript, args, scenario):
    """Run one agent once; return its reply text and the tokens it used."""
    start = scenario.start_prompt if speaker == scenario.first else "The conversation starts. You speak first, in your role."
    result = await Runner.run(agent, view_for(speaker, transcript, args.history, start), max_turns=4)
    tokens = sum(r.usage.input_tokens + r.usage.output_tokens for r in result.raw_responses)
    return str(result.final_output).strip(), tokens


# ---------------------------------------------------------------------------------------------------------
# 3. The conversation loop: the harness around the two agents.
# ---------------------------------------------------------------------------------------------------------

async def talk(args):
    scenario = SCENARIOS[args.scenario]
    model = make_model(args.model)
    agents = {"a": make_agent(scenario.a_name, scenario.a_instructions, model, args.temperature),
              "b": make_agent(scenario.b_name, scenario.b_instructions, model, args.temperature, scenario.b_tools)}
    names = {"a": scenario.a_name, "b": scenario.b_name}
    speaker = args.first or scenario.first
    transcript, tokens, ended = [], 0, "turn limit"
    print(f"\n=== {scenario.title} ===  (model {args.model}, {args.turns} rounds, history {args.history})\n")
    started = time.time()
    for _ in range(2 * args.turns):                        # a round is one message from each agent
        text, used = await one_turn(agents[speaker], speaker, transcript, args, scenario)
        tokens += used
        transcript.append((speaker, text))
        print(f"{names[speaker]}: {text}\n")
        if args.guardrail == "crisis" and speaker == "a" and any(w in text.lower() for w in CRISIS_WORDS):
            print(CRISIS_NOTICE + "\n")
            ended = "guardrail"
            break
        if args.stop and args.stop in text:
            ended = "stop word"
            break
        speaker = "b" if speaker == "a" else "a"
    elapsed = round(time.time() - started, 1)
    summary = summarize(transcript, names, tokens, ended, elapsed, args)
    print("--- summary ---")
    for k, v in summary.items():
        print(f"{k}: {v}")
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump({"scenario": args.scenario, "options": vars(args), "summary": summary,
                       "transcript": [{"speaker": names[w], "text": t} for w, t in transcript]},
                      f, ensure_ascii=False, indent=2)
        print(f"saved to {args.out}")


def summarize(transcript, names, tokens, ended, elapsed, args):
    """Simple counts to compare versions. 'role_break_hints' counts words that often mean an agent left its
    role; it is a hint, so read the transcript before you trust it."""
    words = {names[w]: 0 for w in "ab"}
    for w, t in transcript:
        words[names[w]] += len(t.split())
    breaks = sum(any(p in t.lower() for p in ("as an ai", "language model", "my instructions")) for _, t in transcript)
    return {"messages": len(transcript), "ended_by": ended, "words_per_agent": words,
            "role_break_hints": breaks, "tokens": tokens, "seconds": elapsed}


def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Two agents talk (OpenAI Agents SDK).",
                                formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    p.add_argument("--scenario", choices=sorted(SCENARIOS), default="patient_counsellor")
    p.add_argument("--turns", type=int, default=6, help="rounds; one round = one message from each agent")
    p.add_argument("--first", choices=["a", "b"], default=None, help="who speaks first (default: the scenario's)")
    p.add_argument("--stop", default=STOP_DEFAULT, help='a word that ends the talk; "" turns it off')
    p.add_argument("--history", default="all", help="all, or last:M (the last M messages)")
    p.add_argument("--guardrail", choices=["none", "crisis"], default="none")
    p.add_argument("--temperature", type=float, default=0.8)
    p.add_argument("--model", default=os.environ.get("MODEL", "gpt-4.1-mini"))
    p.add_argument("--out", default="", help="save the transcript and the summary to this JSON file")
    args = p.parse_args(argv)
    if args.history != "all" and not (args.history.startswith("last:") and args.history[5:].isdigit()):
        p.error('--history must be "all" or "last:M", for example last:2')
    return args


if __name__ == "__main__":
    if not os.environ.get("OPENAI_API_KEY"):
        sys.exit("Set OPENAI_API_KEY first (see the top of this file).")
    asyncio.run(talk(parse_args()))
