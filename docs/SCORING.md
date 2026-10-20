# ATS scoring rubric (100 points)

The score is computed by `lib/ats.js`: deterministic, no LLM involved. It models common ATS parsing rules; it is not any vendor's real algorithm.

| Category | Max | What is checked |
|---|---|---|
| Contact and identity | 10 | email, phone, LinkedIn or GitHub, name on first line |
| Section structure | 15 | Summary, Skills, Experience or Projects, Education, Certifications, standard headings |
| Keyword match | 25 | coverage of weighted target keywords (job description terms 2.0, role must-haves 1.5, role nice-to-haves 0.5), alias aware; 85% coverage earns full marks |
| Quantified impact | 15 | share of bullets containing a number or metric (50% earns full marks) |
| Action verbs and bullet quality | 10 | bullets starting with an action verb, 10-26 words, no first person |
| Formatting and layout | 10 | single column, no tables, no graphics, margins, text layer (from layout analysis); text heuristics when no image is available |
| Length and readability | 5 | 350-750 words, 1-2 pages |
| Dates and consistency | 5 | one consistent date format, months and years present |
| Hygiene and clarity | 5 | no clichés, weak phrases, or personal data (DOB, marital status, photo) |

## Why the "after" score can be higher than "before"
The after score assumes the exported single-column, text-based PDF or DOCX is what you submit, so the layout category is scored as ideal.

## No-fabrication guard
`lib/guard.js` extracts numbers, skills (from a skills ontology) and links from both the original and any rewrite. Anything new that is not in the original, in skills you confirmed, or in details you typed is flagged and reverted or removed, whatever the language model returned.
