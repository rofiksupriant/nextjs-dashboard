'use server';

import {z} from 'zod';
import {sql} from "@vercel/postgres";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

const InvoiceSchema = z.object({
    id: z.string(),
    customerId: z.string({invalid_type_error: "Please select a customer."}),
    amount: z.coerce.number().gt(0, {message: "Please enter amount greater than $0."}),
    status: z.enum(['pending', 'paid'], {invalid_type_error: "Please select an invoice status."}),
    date: z.string()
});

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null
}

const CreateInvoice = InvoiceSchema.omit({id: true, date: true})

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    })

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.'
        }
    }

    const {customerId, amount, status} = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
        insert into invoices(customer_id, amount, status, date) values (${customerId}, ${amountInCents}, ${status}, ${date})
       `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        }
    }

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

const UpdateInvoice = InvoiceSchema.omit({id: true, date: true});

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status')
    })

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.'
        }
    }

    const {customerId, amount, status} = validatedFields.data;
    const amountInCents = amount * 100;

    try {
        await sql`
        update invoices
        set customer_id = ${customerId},
            amount = ${amountInCents},
            status = ${status}
        where id = ${id}
        `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Update Invoice.',
        }
    }

    revalidatePath(`/dashboard/invoices`);
    redirect(`/dashboard/invoices`);
}

export async function deleteInvoiceById(id: string) {
    try {
        await sql`
        delete from invoices where id = ${id}
       `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Delete Invoice.',
        }
    }
    revalidatePath(`/dashboard/invoices`);
}