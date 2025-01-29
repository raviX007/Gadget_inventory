export interface CreateGadgetDto {
    name: string;
    description: string;
}

export interface UpdateGadgetDto {
    name?: string;
    description?: string;
    status?: 'Active' | 'Decommissioned' | 'Destroyed';
}