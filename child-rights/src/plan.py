#!/usr/bin/env python3
"""Single source of truth for every scene cue (seconds). Animation, music and SFX all read build/plan.json."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")


def make_plan():
    tl = json.load(open(os.path.join(BUILD, "timeline.json"), encoding="utf-8"))
    lv = tl["levels"]
    plan = {
        "duration": 420.0,
        "start": {"portal": 0.4, "title": 2.4, "button": 3.6, "press": 5.0, "balloons": 5.2,
                  "dock": 5.6, "narrStart": lv["L0"]["start"], "narrEnd": lv["L0"]["end"],
                  "mapIn": 33.0, "mapNodes": [38.0, 40.5, 43.0, 45.5], "unlock1": 50.0, "dive": 56.0},
        "levels": [],
        "win": 380.0, "winNarr": lv["WIN"]["start"], "final": 405.0, "fadeOut": 417.5,
    }
    meta = [
        ("L1", 60.0, "down", "الحق في التعليم"),
        ("L2", 140.0, "right", "الحق في الرعاية الصحية"),
        ("L3", 220.0, "up", "الحق في اللعب وإبداء الرأي"),
        ("L4", 300.0, "right", "الحق في الحماية والعائلة"),
    ]
    for i, (lid, S, enter, right) in enumerate(meta):
        ne = lv[lid]["end"]
        M = round(ne + 2.0, 3)                       # mission begins after the guide finishes
        span = (S + 64.0) - (M + 3.0)
        items = [round(M + 3.0 + k * span / 4, 3) for k in range(4)]
        plan["levels"].append({
            "id": lid, "n": i + 1, "S": S, "enter": enter, "right": right,
            "popup": S + 0.4, "titleIn": S + 1.0, "dock": S + 5.0,
            "narrStart": lv[lid]["start"], "narrEnd": ne,
            "mission": M, "items": items, "collectDelay": 3.4,
            "complete": S + 66.0, "leave": S + 76.0, "next": S + 80.0,
        })
    return plan


if __name__ == "__main__":
    p = make_plan()
    json.dump(p, open(os.path.join(BUILD, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for l in p["levels"]:
        print(l["id"], "narr", l["narrStart"], "->", l["narrEnd"], "mission", l["mission"], "items", l["items"])
