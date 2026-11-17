# Candidate discovery and pilot research

Status: protocol prepared; recruitment, interviews and external review have not occurred.

## Discovery sample

Recruit 12 experienced UK/European candidates: six Java/backend and six QA/SDET, with a mix of recent banking interviews, imminent interviews and transitions into banking. Separately recruit four banking engineering/hiring practitioners. Recruit two independent content reviewers; avoid describing them as advisers until they accept.

Ask consent before recording notes. Participation is voluntary and can be withdrawn. Use a study pseudonym in analysis. Do not request employer-confidential prompts, source code, candidate recordings or personal financial information. Keep contact details separately from research observations; never commit either to this repository.

## Candidate interview, 30 minutes

1. Walk through your most recent preparation period. Which role, domain and round formats did you expect?
2. Show the sequence of tools you used, without revealing credentials or confidential work.
3. Describe a specific preparation problem, its cost in time and what you tried to resolve it.
4. How did you decide which task to practise next? What evidence made you feel prepared?
5. After reading an answer, how did you check that you could solve a different problem independently?
6. Try one representative reconciliation, retry-debugging or test-design exercise. Observe the contract, editor, diagnostics and answer reveal without coaching.
7. Which feedback was useful, confusing or untrustworthy? What would you do next?
8. Would this replace part of your current workflow? Ask for a concrete next action, rather than praise or hypothetical enthusiasm.

## Practitioner interview, 30 minutes

Discuss role expectations, realistic seniority, Java/runtime assumptions, financial conventions, test-automation depth, communication expectations and acceptable AI use. Do not imply that one person's practices represent an entire bank. Ask reviewers to identify inaccurate domain assumptions and ambiguities before suggesting new features.

## Content review gate

Use `research/content-reviews.csv`. For each of 24 tasks, verify contract completeness, example calculations, invalid inputs, sorting rules, monetary precision, reference implementation, adversarial cases, hints, explanation, role relevance and functional-test limitations. Record reviewer identity only with permission; the public site may display approved reviewer attribution after verification. Automated verification is a separate badge.

## Pilot cohorts

Use two consecutive cohorts of up to 15 people. Keep ordinary reading free. Explain daily limits and privacy before execution. Research activity sharing is optional; private learning records remain functional when sharing is off. Avoid treating nonconsent as a failed engagement outcome.

Define activation before analysis: a changed-from-starter full-check attempt, viewed feedback and a later full-check retry within seven days. Count three sessions on distinct dates only for participants still preparing. Distinguish completed interviews and withdrawals from abandonment.

Use matched tasks and a fixed rubric for the independent transfer study. A practitioner should review baseline and later explanations without knowing the order where practical. Record assistance and task differences. Report sample sizes, exclusions and uncertainty. Improvement in a small uncontrolled cohort is a learning signal, not causal proof or a hiring prediction.

## Gates and distribution

Targets: 60% activation; 50% of activated candidates still preparing completing three sessions in week one; positive independent-transfer improvement with a 20-point target; 99% valid infrastructure results; no unresolved critical isolation/data-loss issue; monthly operating cost <= £150. These are proposed gates, not observed results.

Publish a few original exercises and practical explanations. Seek permission before posting to communities or using participant quotations. No outreach, testimonials, case studies, job outcomes, practitioner endorsements or participant counts are implied by this implementation.

## Quarterly competitor review

Refresh `research/competitors.json` and feedback signals every quarter. Keep observed capabilities separate from hypotheses, candidate feedback separate from employer feedback, and old complaints separate from verified current limitations. Do not copy proprietary question banks or claim a platform lacks a feature based only on a missing documentation page.
