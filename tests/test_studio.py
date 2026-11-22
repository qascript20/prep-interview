import json,sys,tempfile,threading,unittest,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from pilot_api import Pilot
from interview_studio import Studio,validate,load_environment
class StudioTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.pilot=Pilot(Path(self.temp.name)/'db.sqlite',lambda *args:[],lambda id:None,threading.BoundedSemaphore(2));self.env={'GEMINI_API_KEY':'test-only','GEMINI_STUDIO_ENABLED':'true'};self.studio=Studio(self.pilot,self.env,lambda s:{'token':'auth_tokens/test'})
    def tearDown(self):self.pilot.pool.shutdown(wait=True);self.temp.cleanup()
    def body(self,**patch):return dict(role='qa-sdet',round='technical',domain='Investment Banking',language='java',company='SMBC',level='senior',mode='text',minutes=5,focus='',consent=True,requestId=str(uuid.uuid4()),**patch)
    def test_free_preview_ownership_and_fixed_duration(self):
        body=self.body();body['minutes']=60
        a,status=self.studio.post('alice','/api/studio/session',body);self.assertEqual(status,201)
        self.assertEqual(self.studio.post('bob','/api/studio/end',{'sessionId':a['sessionId']})[1],404)
        self.studio.post('alice','/api/studio/end',{'sessionId':a['sessionId']})
        self.assertEqual(self.studio.post('alice','/api/studio/session',self.body())[1],402)
    def test_provider_failure_refunds_without_leaking_diagnostics(self):
        def fail(s):raise RuntimeError('secret token diagnostic')
        self.studio.mint=fail;body,status=self.studio.post('alice','/api/studio/session',self.body());self.assertEqual(status,502);self.assertNotIn('secret',json.dumps(body));self.assertEqual(self.studio.status('alice')['remaining'],1)
    def test_cancel_during_provisioning(self):
        body=self.body()
        def mint(s):self.studio.post('alice','/api/studio/end',{'sessionId':body['requestId']});return {'token':'auth_tokens/late'}
        self.studio.mint=mint;result,status=self.studio.post('alice','/api/studio/session',body);self.assertEqual(status,409);self.assertNotIn('auth_tokens/late',json.dumps(result))
    def test_plan_budget_survives_deletion(self):
        self.env['GEMINI_STUDIO_BUDGET_PENCE']='100';body=self.body();body['taskIds']=['2-01-find-duplicate-trade-ids-in-second-occurrence-order'];self.assertEqual(self.studio.post('alice','/api/studio/plan',body)[1],200);self.assertEqual(self.studio.post('alice','/api/studio/session',self.body())[1],429);self.pilot.delete('alice')
        with self.pilot.db() as db:
            row=db.execute('SELECT user_id,reserved_pence FROM studio_plans').fetchone();self.assertTrue(row['user_id'].startswith('deleted-'));self.assertEqual(row['reserved_pence'],10)
    def test_consent_and_company_bounds(self):
        for patch in ({'company':'x'*121},{'consent':False}):
            body=self.body();body.update(patch)
            with self.assertRaises(ValueError):validate(body)
    def test_cancel_before_admission_and_end_after_failure_do_not_use_allowance(self):
        body=self.body();self.studio.post('alice','/api/studio/end',{'sessionId':body['requestId']});self.assertEqual(self.studio.post('alice','/api/studio/session',body)[1],429)
        def fail(s):raise RuntimeError('unavailable')
        self.studio.mint=fail;body=self.body();self.studio.post('alice','/api/studio/session',body);self.studio.post('alice','/api/studio/end',{'sessionId':body['requestId']});self.assertEqual(self.studio.status('alice')['remaining'],1)
