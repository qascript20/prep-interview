import datetime as dt,hashlib,hmac,json,sys,tempfile,threading,time,unittest,uuid
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from pilot_api import Pilot
from billing import Billing,settings
class BillingTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.pilot=Pilot(Path(self.tmp.name)/'db.sqlite',lambda *args:[],lambda id:None,threading.BoundedSemaphore(2));self.env={'STRIPE_SECRET_KEY':'sk_test_testonly','STRIPE_PRICE_ID':'price_test','STRIPE_WEBHOOK_SECRET':'whsec_test','PUBLIC_BASE_URL':'http://127.0.0.1:8796','BILLING_ENABLED':'true','GEMINI_API_KEY':'test-only','GEMINI_STUDIO_ENABLED':'true'};self.order=str(uuid.uuid4());self.subscription={'paid':True,'orderId':self.order,'customerId':'cus_test','subscriptionId':'sub_test','status':'active','periodEnd':int(time.time())+86400,'cancelAtPeriodEnd':False,'active':True};self.billing=Billing(self.pilot,self.env,self.provider)
    def tearDown(self):self.pilot.pool.shutdown(wait=True);self.tmp.cleanup()
    def provider(self,body):
        if body['operation']=='create':return {'checkoutId':'cs_test_example','customerId':'cus_test','url':'https://checkout.stripe.com/c/pay/test'}
        return self.subscription
    def create(self):return self.billing.post('alice','/api/billing/checkout',{'fullName':'Test User','email':'test@example.com','consent':True,'requestId':self.order})
    def test_monthly_checkout_collects_details_but_access_requires_verification(self):
        self.assertEqual(self.create()[1],200);self.assertFalse(self.billing.subscribed('alice'));self.assertEqual(self.billing.post('bob','/api/billing/confirm',{'checkoutId':'cs_test_example'})[1],409)
        self.assertEqual(self.billing.post('alice','/api/billing/confirm',{'checkoutId':'cs_test_example'})[1],200);self.assertTrue(self.billing.subscribed('alice'));self.assertEqual(self.billing.post('alice','/api/billing/confirm',{'checkoutId':'cs_test_example'})[1],200)
        with self.pilot.db() as db:self.assertEqual(db.execute('SELECT count(*) FROM billing_subscriptions').fetchone()[0],1)
    def test_unconfigured_checkout_cannot_start(self):
        self.env['BILLING_ENABLED']='false';self.assertEqual(self.create()[1],503)
        with self.pilot.db() as db:self.assertEqual(db.execute('SELECT count(*) FROM billing_orders').fetchone()[0],0)
    def test_unsigned_webhook_and_wrong_customer_cannot_grant_access(self):
        self.create();self.assertEqual(self.billing.webhook(b'{"type":"checkout.session.completed"}','fake')[1],400);self.subscription['customerId']='cus_other';self.assertEqual(self.billing.post('alice','/api/billing/confirm',{'checkoutId':'cs_test_example'})[1],409);self.assertFalse(self.billing.subscribed('alice'))
    def test_verified_cancellation_removes_access_and_is_idempotent(self):
        self.create();self.billing.fulfill('cs_test_example','alice');self.subscription.update(status='canceled',active=False)
        raw=json.dumps({'type':'customer.subscription.deleted','data':{'object':{'id':'sub_test'}}}).encode();timestamp=str(int(time.time()));signature='t='+timestamp+',v1='+hmac.new(b'whsec_test',timestamp.encode()+b'.'+raw,hashlib.sha256).hexdigest()
        self.assertEqual(self.billing.webhook(raw,signature)[1],200);self.assertEqual(self.billing.webhook(raw,signature)[1],200);self.assertFalse(self.billing.subscribed('alice'))
    def test_deletion_requires_cancellation_then_removes_contact_details(self):
        self.create();self.billing.fulfill('cs_test_example','alice');self.assertEqual(self.pilot.delete('alice')[1],409);self.subscription.update(status='canceled',active=False);self.billing.save('alice',self.subscription);self.assertEqual(self.pilot.delete('alice')[1],200)
        with self.pilot.db() as db:
            row=db.execute('SELECT * FROM billing_orders').fetchone();self.assertEqual(row['full_name'],'');self.assertEqual(row['email'],'');self.assertTrue(row['user_id'].startswith('deleted-'))
    def test_live_charges_are_disabled_for_local_preview(self):
        self.env['STRIPE_SECRET_KEY']='sk_live_testonly';self.assertFalse(settings(self.env)['enabled'])
