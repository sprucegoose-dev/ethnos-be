import StaleGamesCleaner from './clean_stale_games';

jest.mock('./clean_stale_games', () => ({
  cleanUp: jest.fn(),
}));

describe('StaleGamesCleaner Script', () => {
  let exitSpy: any;

  beforeAll(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation();
  });

  afterAll(() => {
    exitSpy.mockRestore();
  });

  it('should call StaleGamesCleaner.cleanUp and process.exit', async () => {
    const mockCleanUp = jest.spyOn(StaleGamesCleaner, 'cleanUp').mockResolvedValueOnce();

    await import('./clean_stale_games.task');

    expect(mockCleanUp).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledTimes(1);
  });

});
