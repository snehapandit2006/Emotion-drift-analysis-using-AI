import sys
import os
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel

# Mean Pooling - Take attention mask into account for correct averaging
def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0] #First element of model_output contains all token embeddings
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def get_embeddings(sentences):
    tokenizer = AutoTokenizer.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
    model = AutoModel.from_pretrained('sentence-transformers/all-MiniLM-L6-v2')
    
    # Tokenize sentences
    encoded_input = tokenizer(sentences, padding=True, truncation=True, return_tensors='pt')
    
    # Compute token embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)
        
    # Perform pooling
    sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])
    
    # Normalize embeddings
    sentence_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)
    return sentence_embeddings

if __name__ == "__main__":
    sentences = [
        "I am so stressed that everything will fall apart.",
        "I am definitely going to fail my exam and my life will be ruined.",
        "Let's go for a walk outside."
    ]
    print("Loading model and generating embeddings...")
    embeddings = get_embeddings(sentences)
    print("Embeddings shape:", embeddings.shape)
    
    # Cosine similarities
    sim_1_2 = torch.dot(embeddings[0], embeddings[1]).item()
    sim_1_3 = torch.dot(embeddings[0], embeddings[2]).item()
    print(f"Similarity (1 vs 2): {sim_1_2:.4f} (should be high catastrophizing similarity)")
    print(f"Similarity (1 vs 3): {sim_1_3:.4f} (should be low)")
