from subprocess import Popen, PIPE
import os

def describe() :
    curfile = os.path.abspath(__file__)
    dir = os.path.dirname(curfile)
    p = Popen("cd %s;  git log --pretty=format:'%%ad %%h %%d' --abbrev-commit --date=short -1" % dir, shell=True, stdout=PIPE) 
    x = p.communicate()[0]
    
    return x

if __name__ == "__main__":
    describe()
