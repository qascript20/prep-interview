import json,sys,tempfile,threading,unittest,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from pilot_api import Pilot
from interview_studio import Studio,validate,load_environment,CATALOGUE
class StudioTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.pilot=Pilot(Path(self.temp.name)/'db.sqlite',lambda *args:[],lambda id:None,threading.BoundedSemaphore(2));self.env={'GEMINI_API_KEY':'test-only','GEMINI_STUDIO_ENABLED':'true'};self.studio=Studio(self.pilot,self.env,lambda s:{'token':'auth_tokens/test'})
        with self.pilot.db() as db:db.execute("INSERT INTO billing_subscriptions VALUES ('alice','cus_test','sub_test','active',strftime('%s','now')+86400,0,datetime('now'))")
    def tearDown(self):self.pilot.pool.shutdown(wait=True);self.temp.cleanup()
    def body(self,**patch):return dict(role='qa-sdet',round='technical',domain='Investment Banking',language='java',company='SMBC',level='senior',mode='text',minutes=5,focus='',consent=True,requestId=str(uuid.uuid4()),**patch)
    def test_paid_live_ownership_and_fixed_connection_lease(self):
        body=self.body();body['minutes']=60
        a,status=self.studio.post('alice','/api/studio/session',body);self.assertEqual(status,201)
        self.assertEqual(self.studio.post('bob','/api/studio/end',{'sessionId':a['sessionId']})[1],404)
        self.studio.post('alice','/api/studio/end',{'sessionId':a['sessionId']})
        self.assertEqual(self.studio.post('alice','/api/studio/session',self.body())[1],201)
    def test_provider_failure_refunds_without_leaking_diagnostics(self):
        def fail(s):raise RuntimeError('secret token diagnostic')
        self.studio.mint=fail;body,status=self.studio.post('alice','/api/studio/session',self.body());self.assertEqual(status,502);self.assertNotIn('secret',json.dumps(body));self.assertEqual(self.studio.status('alice')['remaining'],None)
    def test_cancel_during_provisioning(self):
        body=self.body()
        def mint(s):self.studio.post('alice','/api/studio/end',{'sessionId':body['requestId']});return {'token':'auth_tokens/late'}
        self.studio.mint=mint;result,status=self.studio.post('alice','/api/studio/session',body);self.assertEqual(status,409);self.assertNotIn('auth_tokens/late',json.dumps(result))
    def test_plan_budget_survives_deletion(self):
        with self.pilot.db() as db:db.execute("DELETE FROM billing_subscriptions WHERE user_id='alice'")
        self.env['GEMINI_STUDIO_BUDGET_PENCE']='100';body=self.body();body['taskIds']=['2-01-find-duplicate-trade-ids-in-second-occurrence-order'];self.assertEqual(self.studio.post('alice','/api/studio/plan',body)[1],200);self.assertEqual(self.studio.post('alice','/api/studio/session',self.body())[1],429);self.pilot.delete('alice')
        with self.pilot.db() as db:
            row=db.execute('SELECT user_id,reserved_pence FROM studio_plans').fetchone();self.assertTrue(row['user_id'].startswith('deleted-'));self.assertEqual(row['reserved_pence'],10)
    def test_consent_and_company_bounds(self):
        for patch in ({'company':'x'*121},{'consent':False}):
            body=self.body();body.update(patch)
            with self.assertRaises(ValueError):validate(body)
    def test_it_roles_business_sectors_and_saved_domain_migration(self):
        for role in CATALOGUE['roles']:
            for domain in CATALOGUE['domains']:
                body=self.body();body.update(role=role['id'],domain=domain)
                self.assertEqual(validate(body)['domain'],domain)
        for previous,current in CATALOGUE['legacyDomainAliases'].items():
            body=self.body();body['domain']=previous
            self.assertEqual(validate(body)['domain'],current)
        for domain in ('Invented sector',[],{}):
            body=self.body();body['domain']=domain
            with self.assertRaises(ValueError):validate(body)
    def test_cancel_before_admission_and_end_after_failure_do_not_use_allowance(self):
        body=self.body();self.studio.post('alice','/api/studio/end',{'sessionId':body['requestId']});self.assertEqual(self.studio.post('alice','/api/studio/session',body)[1],429)
        def fail(s):raise RuntimeError('unavailable')
        self.studio.mint=fail;body=self.body();self.studio.post('alice','/api/studio/session',body);self.studio.post('alice','/api/studio/end',{'sessionId':body['requestId']});self.assertEqual(self.studio.status('alice')['remaining'],None)

    def test_free_question_status_and_consent_use_shared_local_adapter(self):
        with self.pilot.db() as db:
            db.execute("DELETE FROM billing_subscriptions WHERE user_id='alice'")
            db.execute("INSERT INTO studio_trials VALUES ('alice',?,datetime('now'))",(str(uuid.uuid4()),))
        self.assertEqual(self.studio.status('alice')['remaining'],5)
        body=self.body();body['consent']=False
        result,status=self.studio.post('alice','/api/studio/session',body)
        self.assertEqual(status,400);self.assertIn('Confirm',result['error'])
