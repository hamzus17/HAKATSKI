import json
from collections import Counter, defaultdict

alertes = json.load(open("output/alertes.json", encoding="utf-8"))
print(f"{len(alertes)} alertes brutes\n")

groupes = defaultdict(list)
for a in alertes:
    groupes[a["pluginId"]].append(a)

print(f"{len(groupes)} types distincts :\n")
for liste in sorted(groupes.values(), key=len, reverse=True):
    a = liste[0]
    print(f'{len(liste):3d}x  [{a["risk"]:13}]  {a["alert"]}  (CWE-{a["cweid"]})')

print("\nPar gravite :", dict(Counter(a["risk"] for a in alertes)))
