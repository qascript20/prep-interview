import json,sys,tempfile,threading,time,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from grading import catalogue,grade,mutation_grade,ORACLES,validate_files
from pilot_api import Pilot
class GradingTests(unittest.TestCase):
    def setUp(self):self.problems=catalogue();self.duplicate=next(iter(self.problems.values()))
    def test_outputs_are_checked_outside_candidate_program(self):
        result=grade(self.duplicate,[{'status':'completed','stdout':'PASS','stderr':''} for _ in self.duplicate['tests']])
        self.assertEqual(result['status'],'incorrect_output');self.assertEqual(result['passed'],0)
    def test_reference_contract_outputs(self):
        for p in self.problems.values():
            if p['format']=='testing':continue
            result=grade(p,[{'status':'completed','stdout':t['expected']+'\n','stderr':''} for t in p['tests']])
            self.assertEqual(result['status'],'completed',p['id'])
    def test_missing_runs_are_infrastructure_error(self):self.assertEqual(grade(self.duplicate,[])['status'],'infrastructure_error')
    def test_money_rounds_once_and_half_up(self):
        self.assertEqual(ORACLES['money']('3|0.335'),'1.01');self.assertEqual(ORACLES['money']('1|1.005'),'1.01')
    def test_invalid_mutation_assertion_is_rejected(self):
        p=next(p for p in self.problems.values() if p.get('oracle')=='money')
        result=mutation_grade(p,'3|0.335 => 1.02');self.assertEqual(result['passed'],0);self.assertEqual(result['cases'][0]['category'],'test-validity')
    def test_file_validation_rejects_traversal(self):
        for files in ({'Main.java':'x','../Secret.java':'x'},{'Main.java':'package x; class Main {}'},{'Main.java':'x'*131073}):
            with self.assertRaises(ValueError):validate_files(files)
class PersistenceTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.pilot=Pilot(Path(self.temp.name)/'db.sqlite',lambda files,inputs,id:[{'status':'completed','stdout':'WRONG','stderr':''} for _ in inputs],lambda id:None,threading.BoundedSemaphore(2));self.p=next(iter(catalogue().values()));self.user='alice'
    def tearDown(self):self.pilot.pool.shutdown(wait=True);self.temp.cleanup()
    def test_draft_conflict_preserves_server_copy(self):
        body={'problemId':self.p['id'],'revision':0,'files':self.p['starter']}
        saved,status=self.pilot.post(self.user,'/api/pilot/drafts',body);self.assertEqual(saved['revision'],1)
        conflict,status=self.pilot.post(self.user,'/api/pilot/drafts',{**body,'files':{'Main.java':'other'}})
        self.assertEqual(status,409);self.assertEqual(conflict['files'],self.p['starter'])
    def test_private_history_and_source_restore(self):
        record,status=self.pilot.evaluate(self.user,{'problemId':self.p['id'],'version':self.p['version'],'files':self.p['starter'],'runId':'test-private','assistance':{},'explanation':''})
        self.pilot.pool.shutdown(wait=True)
        other,status=self.pilot.get('bob','/api/pilot/jobs/test-private');self.assertEqual(status,404)
        own,status=self.pilot.get(self.user,'/api/pilot/jobs/test-private');self.assertEqual(own['status'],'incorrect_output');self.assertEqual(own['files'],self.p['starter'])
    def test_deletion_is_scoped_to_workspace(self):
        for user in ['alice','bob']:self.pilot.post(user,'/api/pilot/drafts',{'problemId':self.p['id'],'revision':0,'files':self.p['starter']})
        self.pilot.delete('alice');self.assertEqual(self.pilot.get('alice','/api/pilot/drafts')[0]['drafts'],[]);self.assertEqual(len(self.pilot.get('bob','/api/pilot/drafts')[0]['drafts']),1)
    def test_disabled_ai_does_not_make_external_call(self):self.assertEqual(self.pilot.post('alice','/api/pilot/ai-feedback',{})[1],503)
    def test_restart_does_not_turn_interrupted_execution_into_wrong_answer(self):
        with self.pilot.db() as db:db.execute("INSERT INTO pilot_attempts(id,user_id,problem_id,problem_version,language,mode,status,files,assistance,explanation,created_at,updated_at,day,month,reserved_pence) VALUES ('restart','alice','p','v','java','check','running','{}','{}','','x','x','x','x',5)")
        restarted=Pilot(self.pilot.path,lambda *args:[],lambda id:None,threading.BoundedSemaphore(2));self.assertEqual(restarted.get('alice','/api/pilot/jobs/restart')[0]['status'],'infrastructure_error');restarted.pool.shutdown()
if __name__=='__main__':unittest.main()
