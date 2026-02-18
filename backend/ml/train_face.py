import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from transformers import ViTForImageClassification, ViTImageProcessor
import time
import copy
import json

def train_model(data_dir, num_epochs=5):
    print(f"Starting ViT training from: {data_dir}")
    
    # ViT requires 224x224 images
    # We can use the feature extractor to get exact normalization if we want, 
    # but standard ImageNet normalization is usually fine for google/vit-base-patch16-224
    
    data_transforms = {
        'train': transforms.Compose([
            transforms.Resize((224, 224)), 
            transforms.RandomHorizontalFlip(),
            transforms.ToTensor(),
            transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]) # ViT usually expects 0.5 std/mean or ImageNet
        ]),
        'test': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
        ]),
    }

    # Load Datasets
    image_datasets = {x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x]) 
                      for x in ['train', 'test']}
    
    dataloaders = {x: DataLoader(image_datasets[x], batch_size=16, shuffle=True, num_workers=0) 
                   for x in ['train', 'test']} # Reduced batch size for ViT memory
    
    dataset_sizes = {x: len(image_datasets[x]) for x in ['train', 'test']}
    class_names = image_datasets['train'].classes
    
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    print(f"Classes: {class_names}")

    # Load Pretrained ViT
    # ID2LABEL mapping for inference
    id2label = {str(i): c for i, c in enumerate(class_names)}
    label2id = {c: str(i) for i, c in enumerate(class_names)}
    
    API_MODEL_NAME = 'google/vit-base-patch16-224-in21k'
    print(f"Loading {API_MODEL_NAME}...")
    
    model = ViTForImageClassification.from_pretrained(
        API_MODEL_NAME,
        num_labels=len(class_names),
        id2label=id2label,
        label2id=label2id
    )

    model = model.to(device)

    # ViT Optimization
    optimizer = optim.AdamW(model.parameters(), lr=2e-5) # Lower LR for Transformer fine-tuning
    criterion = nn.CrossEntropyLoss()
    
    # Scheduler
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.1)

    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    start_time = time.time()

    for epoch in range(num_epochs):
        print(f'Epoch {epoch}/{num_epochs - 1}')
        print('-' * 10)

        for phase in ['train', 'test']:
            if phase == 'train':
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == 'train'):
                    outputs = model(inputs)
                    # ViT outputs object, validation needs logits
                    logits = outputs.logits
                    _, preds = torch.max(logits, 1)
                    loss = criterion(logits, labels)

                    if phase == 'train':
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)
            
            if phase == 'train':
                scheduler.step()

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f'{phase} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}')

            if phase == 'test' and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())
                
                # Save checkpoint immediately
                # model.load_state_dict(best_model_wts)
                # output_dir = os.path.join(os.path.dirname(__file__), 'face_model_vit')
                # model.save_pretrained(output_dir)

    time_elapsed = time.time() - start_time
    print(f'Training complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s')
    print(f'Best val Acc: {best_acc:4f}')

    # Load best weights
    model.load_state_dict(best_model_wts)
    
    # Save Model (HuggingFace Format)
    output_dir = os.path.join(os.path.dirname(__file__), 'face_model_vit')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    print(f"Saving model to {output_dir}...")
    model.save_pretrained(output_dir)
    
    # Also save a processor config if needed, though mostly standard
    processor = ViTImageProcessor.from_pretrained(API_MODEL_NAME)
    processor.save_pretrained(output_dir)
    
    print("Model saved successfully.")

if __name__ == "__main__":
    # Point this to your dataset
    # Expecting: E:\emotion-drift\datasets\face emotion
    DATASET_PATH = r"E:\emotion-drift\datasets\face emotion"
    
    if os.path.exists(DATASET_PATH):
        # Dry run with 1 epoch just to test code if user runs it, 
        # or defaults to 5.
        train_model(DATASET_PATH, num_epochs=3)
    else:
        print(f"Dataset not found at {DATASET_PATH}")
        print("Please ensure your dataset is structured as train/test folders.")
