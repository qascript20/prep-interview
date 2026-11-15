"""Apply per-process limits before exec, without preexec_fn in a threaded server."""
import os,resource,sys
resource.setrlimit(resource.RLIMIT_CORE,(0,0))
resource.setrlimit(resource.RLIMIT_CPU,(5,6))
resource.setrlimit(resource.RLIMIT_FSIZE,(8*1024*1024,8*1024*1024))
resource.setrlimit(resource.RLIMIT_NOFILE,(96,96))
# No shell is involved; the parent chooses the executable and all flags.
os.execv(sys.argv[1],sys.argv[1:])
