import { Types } from 'mongoose';
import { ServiceRequestModel } from '../modules/service-requests/serviceRequests.model';
import { restrictToOwnJobs, assertOwnFieldRecord, isFieldRole } from './ownFieldScope';
import { AccessTokenPayload } from './jwt';
import { NotFoundError } from './errors';

jest.mock('../modules/service-requests/serviceRequests.model', () => ({
  ServiceRequestModel: { find: jest.fn(), exists: jest.fn() },
}));

const mockedFind = ServiceRequestModel.find as unknown as jest.Mock;
const mockedExists = ServiceRequestModel.exists as unknown as jest.Mock;

const vendorTech = { sub: 'u1', role: 'VENDOR_TECHNICIAN', vendorId: 'v1' } as unknown as AccessTokenPayload;
const employeeTech = { sub: 'u2', role: 'TECHNICIAN', employeeId: 'e1' } as unknown as AccessTokenPayload;
const customer = { sub: 'u3', role: 'CUSTOMER' } as unknown as AccessTokenPayload;

const sr1 = new Types.ObjectId();
const sr2 = new Types.ObjectId();

beforeEach(() => {
  mockedFind.mockReset();
  mockedExists.mockReset();
  mockedFind.mockReturnValue({ distinct: jest.fn().mockResolvedValue([sr1, sr2]) });
});

describe('ownFieldScope', () => {
  it('knows which roles are field roles', () => {
    expect(isFieldRole('VENDOR_OWNER')).toBe(true);
    expect(isFieldRole('EMPLOYEE')).toBe(true);
    expect(isFieldRole('CUSTOMER')).toBe(false);
    expect(isFieldRole('BRANCH_MANAGER')).toBe(false);
  });

  it('limits a vendor technician to jobs assigned to their vendor', async () => {
    const filter: Record<string, unknown> = {};
    await restrictToOwnJobs(filter, 'OWN', vendorTech);
    expect(mockedFind).toHaveBeenCalledWith({ assigneeType: 'VENDOR', assigneeId: 'v1' });
    expect(filter.serviceRequestId).toEqual({ $in: [sr1, sr2] });
  });

  it('limits an employee technician to jobs assigned to their employee record', async () => {
    const filter: Record<string, unknown> = {};
    await restrictToOwnJobs(filter, 'OWN', employeeTech);
    expect(mockedFind).toHaveBeenCalledWith({ assigneeType: 'EMPLOYEE', assigneeId: 'e1' });
  });

  it('returns nothing when the asked-for job is not theirs', async () => {
    const filter: Record<string, unknown> = {};
    await restrictToOwnJobs(filter, 'OWN', vendorTech, new Types.ObjectId().toString());
    expect(filter.serviceRequestId).toEqual({ $in: [] });
  });

  it('leaves customers and wider scopes alone', async () => {
    const a: Record<string, unknown> = {};
    await restrictToOwnJobs(a, 'OWN', customer);
    const b: Record<string, unknown> = {};
    await restrictToOwnJobs(b, 'VENDOR', vendorTech);
    expect(a).toEqual({});
    expect(b).toEqual({});
    expect(mockedFind).not.toHaveBeenCalled();
  });

  it('hides a single record whose job is not theirs (404)', async () => {
    mockedExists.mockResolvedValue(null);
    await expect(assertOwnFieldRecord(sr1, 'OWN', vendorTech)).rejects.toBeInstanceOf(NotFoundError);
    mockedExists.mockResolvedValue({ _id: sr1 });
    await expect(assertOwnFieldRecord(sr1, 'OWN', vendorTech)).resolves.toBeUndefined();
  });
});
