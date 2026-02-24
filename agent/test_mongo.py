import logging
logging.basicConfig(level=logging.DEBUG)

import os
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv
import dns.resolver

dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8']

load_dotenv()
mongo_uri = os.getenv("MONGODB_URI")
try:
    print("Connecting to:", mongo_uri)
    mongo_client = MongoClient(
        mongo_uri, 
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000
    )
    mongo_client.admin.command('ping')
    print("✓ Successfully connected to MongoDB")
except Exception as e:
    import traceback
    traceback.print_exc()
