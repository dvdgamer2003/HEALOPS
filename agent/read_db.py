from pymongo import MongoClient

db = MongoClient('mongodb+srv://divyeshshirude:QOQ0XjJpUoE3zOaI@cluster0.a40p2.mongodb.net/ci-cd-agent?retryWrites=true&w=majority&appName=Cluster0').get_database()
runs = list(db.runresults.find().sort('start_time', -1).limit(4))
for r in runs:
    print(r.get('status'), r.get('currentStep'), r.get('runId'))
    print(r.get('logs'))
    print("---")
