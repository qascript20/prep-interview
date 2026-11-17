#!/usr/bin/env python3
"""Read-only operational report. No source, explanations, IDs or invented study outcomes."""
import argparse, json,sqlite3
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--db',default='.runtime/pilot.sqlite3');args=p.parse_args()
db=sqlite3.connect('file:'+str(Path(args.db).resolve())+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
members=db.execute('SELECT count(*) FROM pilot_members').fetchone()[0]
consented=db.execute('SELECT count(*) FROM pilot_members WHERE telemetry=1').fetchone()[0]
statuses={row['status']:row['n'] for row in db.execute('SELECT status,count(*) AS n FROM pilot_attempts GROUP BY status')}
finished=sum(n for status,n in statuses.items() if status not in ('queued','running'))
result={'environment':'Local operational data; includes QA activity and is not a candidate study','workspaces':members,'researchOptInWorkspaces':consented,'submittedJobStatuses':statuses,'infrastructureResultRate':None if not finished else round((finished-statuses.get('infrastructure_error',0))/finished,4),'limitations':['Admission failures are not included in submitted-job reliability.','Activation and transfer-learning targets require consented cohort analysis and practitioner-reviewed observations.','No hiring-success or readiness score is inferred.']}
print(json.dumps(result,indent=2))
