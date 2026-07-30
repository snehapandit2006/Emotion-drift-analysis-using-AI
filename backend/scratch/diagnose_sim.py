import sys
import os
import torch
import torch.nn.functional as F

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analysis.cognitive_features import get_embedding_model, _pattern_library_phrases, load_pattern_library_embeddings, _pattern_library_embeddings

load_pattern_library_embeddings()
tokenizer, model = get_embedding_model()

# Text to test
text = "My boss didn't reply to my email immediately. They are definitely going to fire me tomorrow."

# Embed text
encoded = tokenizer([text], padding=True, truncation=True, return_tensors='pt')
with torch.no_grad():
    outputs = model(**encoded)
from analysis.cognitive_features import mean_pooling
user_emb = mean_pooling(outputs, encoded['attention_mask'])
user_emb = F.normalize(user_emb, p=2, dim=1)

# Compare to catastrophizing
lib_emb = _pattern_library_embeddings["catastrophizing"]
sims = torch.matmul(user_emb, lib_emb.t())[0]

phrases = _pattern_library_phrases["catastrophizing"]
results = []
for idx, sim in enumerate(sims.tolist()):
    results.append((sim, phrases[idx]))

results.sort(reverse=True)
print("Top matches for catastrophizing:")
for sim, phrase in results[:10]:
    print(f"  {sim:.4f} : {phrase}")
