about the project 
------------------

-> AMOS is an AI-powered platform designed to help patients manage long-term medications. It predicts medicine depletion, sends reminders, and automatically reorders medicines from nearby pharmacies to ensure uninterrupted treatment.  

->it should have only one interface -patients interface

-> it should be able to store the details of the patient

-> it should register the user by creating an account and login them

-> it should be able to take input of a picture either by browsing or by camera 

-> an ocr model is used to extract the text from the image

-> the medicines details are stored in the database

-> based on the patient's medicine intake patterns, the standalone ai predicts the depletion time

->Scheduler will check whether it is depletion date or not and sends a reminder notification if it is not depletion date else triggers reorder request

-> if it is a depletion date, standlone ai will check  for the nearest pharmacy and sends a reorder request to the pharmacy

-> simultaneously ai sends a notification to the patient about the reorder request

-> if he accepts the reorder request , it proceeds with the payment process only if medicine is available in any of the nearest pharmacies

-> once payment done, it will send a notification to the pharmacy to dispense the medicine





